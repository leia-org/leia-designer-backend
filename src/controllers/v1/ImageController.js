import ImageGeneration from '../../services/v1/ImageGeneration.js';
import S3Service from '../../services/v1/s3.js';
import LeiaService from '../../services/v1/LeiaService.js';
import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';

const ENTITY_CONFIG = {
  personas: {
    label: 'Persona',
    entityType: 'personas',
    service: PersonaService,
    generate: (entity) => ImageGeneration.generatePersonaAvatar(entity),
  },
  problems: {
    label: 'Problem',
    entityType: 'problems',
    service: ProblemService,
    generate: (entity) => ImageGeneration.generateProblemAvatar(entity),
  },
  leias: {
    label: 'Leia',
    entityType: 'leias',
    service: LeiaService,
    generate: (entity) => ImageGeneration.generateLeiaAvatar(entity),
  },
};

function canModify(entity, context) {
  if (context.role === 'admin' || context.internal) {
    return true;
  }
  return !!entity?.user && entity.user.equals(context.userId);
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

async function generateAvatarForEntity(req, res, next, config) {
  try {
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

    const generationResult = await config.generate(toGeneratorPayload(entity));
    const storedAvatar = await S3Service.saveAvatar({
      entityType: config.entityType,
      entityId: entity._id.toString(),
      imageDataUrl: generationResult.avatar,
      previousAvatar: entity.spec?.avatar,
    });

    entity.set('spec.avatar', storedAvatar.key);
    const updatedEntity = await entity.save();

    if (storedAvatar.previousKey && storedAvatar.previousKey !== storedAvatar.key) {
      await S3Service.deleteObject(storedAvatar.previousKey);
    }

    res.status(200).json({
      avatar: storedAvatar.key,
      key: storedAvatar.key,
      sizeBytes: storedAvatar.sizeBytes,
      entity: updatedEntity,
    });
  } catch (err) {
    next(err);
  }
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

export const generateInfographic = async (req, res, next) => {
  try {
    const { behaviour, solution } = req.body;
    if (!behaviour) {
      const error = new Error('Behaviour is required');
      error.statusCode = 400;
      throw error;
    }
    const generationResult = await ImageGeneration.generateInfographic(behaviour, solution);
    res.status(200).json({
      infographic: generationResult.infographic,
      sizeBytes: generationResult.sizeBytes,
    });
  } catch (err) {
    next(err);
  }
};

