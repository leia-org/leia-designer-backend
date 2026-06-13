import ImageGeneration from '../../services/v1/ImageGeneration.js';
import S3Service from '../../services/v1/s3.js';
import LeiaService from '../../services/v1/LeiaService.js';
import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';
import axios from 'axios';

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

function canModify(entity, context) {
  if (context.role === 'admin' || context.internal) {
    return true;
  }
  return !!entity?.user && entity.user.equals(context.userId);
}

function getGeminiApiKeyConfig(req) {
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

async function validateGeminiApiKey({ apiKeyId, apiKeyRequesterId }) {
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

async function generateStoredImageForEntity(req, res, next, config) {
  try {
    const apiKeyConfig = getGeminiApiKeyConfig(req);
    const entity = await loadMutableEntity(req, config);
    await validateGeminiApiKey(apiKeyConfig);
    const generationResult = await config.generate(entity, apiKeyConfig);
    const storedImage = await config.store(entity, generationResult);

    entity.set(config.specPath, storedImage.key);
    const updatedEntity = await entity.save();

    if (storedImage.previousKey && storedImage.previousKey !== storedImage.key) {
      await S3Service.deleteObject(storedImage.previousKey);
    }

    res.status(200).json({
      [config.responseField]: storedImage.key,
      key: storedImage.key,
      contentType: storedImage.contentType,
      sizeBytes: storedImage.sizeBytes,
      entity: updatedEntity,
    });
  } catch (err) {
    next(err);
  }
}

async function generateAvatarForEntity(req, res, next, config) {
  await generateStoredImageForEntity(req, res, next, {
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
  });
}

async function generateInfographicForLeia(req, res, next, config) {
  await generateStoredImageForEntity(req, res, next, {
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
  });
}

export const generatePersonaAvatar = async (req, res, next) => {
  await generateAvatarForEntity(req, res, next, ENTITY_CONFIG.personas);
};

export const generateProblemAvatar = async (req, res, next) => {
  await generateAvatarForEntity(req, res, next, ENTITY_CONFIG.problems);
};

export const generateLeiaAvatar = async (req, res, next) => {
  await generateAvatarForEntity(req, res, next, ENTITY_CONFIG.leias);
};

export const generateLeiaInfographic = async (req, res, next) => {
  await generateInfographicForLeia(req, res, next, INFOGRAPHIC_CONFIG.infographic);
};

export const generateLeiaInfographicSolution = async (req, res, next) => {
  await generateInfographicForLeia(req, res, next, INFOGRAPHIC_CONFIG.infographicSolution);
};
