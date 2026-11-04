import ImageGeneration from '../../services/v1/ImageGeneration.js';
import S3Service from '../../services/v1/s3.js';
import LeiaService from '../../services/v1/LeiaService.js';
import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import Leia from '../../models/Leia.js';

const ENTITY_CONFIG = {
  personas: {
    label: 'Persona',
    entityType: 'personas',
    service: PersonaService,
    generate: (entity, apiKeyConfig) => ImageGeneration.generatePersonaAvatar(entity, apiKeyConfig),
  },
  problems: {
    label: 'Problem',
    entityType: 'problems',
    service: ProblemService,
    generate: (entity, apiKeyConfig) => ImageGeneration.generateProblemAvatar(entity, apiKeyConfig),
  },
  leias: {
    label: 'Leia',
    entityType: 'leias',
    service: LeiaService,
    generate: (entity, apiKeyConfig) => ImageGeneration.generateLeiaAvatar(entity, apiKeyConfig),
  },
};

const INFOGRAPHIC_CONFIG = {
  infographic: {
    label: 'Infographic',
    variant: 'infographic',
    specPath: 'spec.infographic',
    responseField: 'infographic',
    includeSolution: false,
  },
  infographicSolution: {
    label: 'Infographic solution',
    variant: 'infographicSolution',
    specPath: 'spec.infographicSolution',
    responseField: 'infographicSolution',
    includeSolution: true,
  },
};

export function canModify(entity, context) {
  if (context.role === 'admin' || context.internal) {
    return true;
  }
  const owner = entity?.user;
  const ownerId = owner?._id || (typeof owner?.id === 'string' ? owner.id : owner);
  return !!ownerId && String(ownerId) === String(context.userId);
}

export function getGeminiApiKeyConfig(req) {
  const apiKeyId = typeof req.body?.apiKeyId === 'string' ? req.body.apiKeyId.trim() : '';
  const apiKeyRequesterId = req.auth?.payload?.id;

  if (!apiKeyId) {
    const error = new Error('apiKeyId is required');
    error.statusCode = 400;
    throw error;
  }

  if (!apiKeyRequesterId) {
    const error = new Error('User ID is required for API key usage');
    error.statusCode = 400;
    throw error;
  }

  return { apiKeyId, apiKeyRequesterId };
}

export async function validateGeminiApiKey({ apiKeyId, apiKeyRequesterId }) {
  try {
    await axios.post(
      `${process.env.AUTH_SERVICE_URL}/api/v1/apikeys/validate-provider`,
      { provider: 'gemini', apiKeyId, apiKeyRequesterId },
      { headers: { 'x-intern-token': process.env.INTERN_TOKEN } }
    );
  } catch (err) {
    const status = err.response?.status;
    const error = new Error(
      status === 400
        ? 'API key must be a Gemini key'
        : err.response?.data?.message || err.message || 'Failed to validate Gemini API key'
    );
    error.statusCode = status === 404 ? 404 : status === 403 ? 403 : 400;
    throw error;
  }
}

function toGeneratorPayload(entity) {
  const payload = typeof entity?.toJSON === 'function' ? entity.toJSON() : entity;
  const spec = payload?.spec || {};
  const metadata = payload?.metadata || {};

  if (payload?.kind === 'Persona' || spec.fullName || spec.personality) {
    return {
      name: spec.fullName || metadata.name,
      description: spec.description,
      personality: Array.isArray(spec.personality) ? spec.personality.join(', ') : spec.personality,
    };
  }

  if (payload?.kind === 'Problem' || spec.personaBackground || spec.solution) {
    return {
      name: metadata.name,
      description: spec.description,
    };
  }

  const personaSpec = payload?.spec?.persona?.spec || {};
  const personaMetadata = payload?.spec?.persona?.metadata || {};
  const problemSpec = payload?.spec?.problem?.spec || {};

  return {
    leiaName: metadata.name,
    personaName: personaSpec.fullName || personaMetadata.name,
    personaDescription: personaSpec.description,
    problemDescription: problemSpec.description,
  };
}

async function loadMutableEntity(req, config) {
  const context = {
    userId: req.auth?.payload?.id,
    role: req.auth?.payload?.role,
  };

  const entity = await config.service.findById(req.params.id, context);
  if (!entity) {
    const error = new Error(`${config.label} not found`);
    error.statusCode = 404;
    throw error;
  }

  if (!canModify(entity, context)) {
    const error = new Error('Unauthorized');
    error.statusCode = 403;
    throw error;
  }

  return entity;
}

async function generateStoredImage(req, config) {
    const apiKeyConfig = getGeminiApiKeyConfig(req);
    const entity = await loadMutableEntity(req, config);
    await validateGeminiApiKey(apiKeyConfig);
    const generationResult = await config.generate(entity, apiKeyConfig);
    const storedImage = await config.store(entity, generationResult);

    // Persist the version, so reopening another view/browser bypasses cached
    // content and cached 404s too, rather than only the original modal doing so.
    const image = `${storedImage.key}?v=${randomUUID()}`;
    entity.set(config.specPath, image);
    const updatedEntity = await entity.save();

    // LEIAs contain snapshots of their components. Keep only their image
    // reference in sync; never overwrite the rest of a versioned snapshot.
    if (config.entityType === 'problems' || config.entityType === 'personas') {
      const component = config.entityType === 'problems' ? 'problem' : 'persona';
      await Leia.updateMany(
        { [`spec.${component}Id`]: entity._id },
        { $set: { [`spec.${component}.spec.avatar`]: image } }
      );
    }

    if (storedImage.previousKey && storedImage.previousKey !== storedImage.key) {
      await S3Service.deleteObject(storedImage.previousKey);
    }

    return {
      [config.responseField]: image,
      key: storedImage.key,
      contentType: storedImage.contentType,
      sizeBytes: storedImage.sizeBytes,
      entity: updatedEntity,
    };
}

function avatarConfig(config) {
  return {
    ...config,
    specPath: 'spec.avatar',
    responseField: 'avatar',
    generate: (entity, apiKeyConfig) => config.generate(toGeneratorPayload(entity), apiKeyConfig),
    store: (entity, generationResult) =>
      S3Service.saveAvatar({
        entityType: config.entityType,
        entityId: entity._id.toString(),
        imageDataUrl: generationResult.avatar,
        previousAvatar: entity.spec?.avatar,
      }),
  };
}

function infographicConfig(config) {
  return {
    ...config,
    service: LeiaService,
    generate: (leia, apiKeyConfig) => {
      return ImageGeneration.generateInfographic(leia, config.includeSolution, apiKeyConfig);
    },
    store: (leia, generationResult) =>
      S3Service.saveLeiaInfographic({
        leiaId: leia._id.toString(),
        variant: config.variant,
        image: generationResult.infographic,
        contentType: generationResult.contentType,
        previousImage: leia.get(config.specPath),
      }),
  };
}

export async function generateImageForTarget(target, id, context, apiKeyConfig) {
  const config = ENTITY_CONFIG[target]
    ? avatarConfig(ENTITY_CONFIG[target])
    : INFOGRAPHIC_CONFIG[target] ? infographicConfig(INFOGRAPHIC_CONFIG[target]) : null;
  if (!config) throw Object.assign(new Error('Invalid image target'), { statusCode: 400 });
  return generateStoredImage({ params: { id }, auth: { payload: { id: context.userId, role: context.role } }, body: apiKeyConfig }, config);
}

async function generateForRequest(req, res, next, target) {
  try {
    const result = await generateImageForTarget(target, req.params.id,
      { userId: req.auth?.payload?.id, role: req.auth?.payload?.role }, req.body);
    res.status(200).json(result);
  } catch (error) { next(error); }
}

export const generatePersonaAvatar = async (req, res, next) => {
  await generateForRequest(req, res, next, 'personas');
};

export const generateProblemAvatar = async (req, res, next) => {
  await generateForRequest(req, res, next, 'problems');
};

export const generateLeiaAvatar = async (req, res, next) => {
  await generateForRequest(req, res, next, 'leias');
};

export const generateLeiaInfographic = async (req, res, next) => {
  await generateForRequest(req, res, next, 'infographic');
};

export const generateLeiaInfographicSolution = async (req, res, next) => {
  await generateForRequest(req, res, next, 'infographicSolution');
};
