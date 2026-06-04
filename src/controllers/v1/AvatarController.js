import AvatarGeneration from '../../services/v1/AvatarGeneration.js';
import S3Service from '../../services/v1/s3.js';
import LeiaService from '../../services/v1/LeiaService.js';
import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';

const ENTITY_CONFIG = {
  personas: {
    label: 'Persona',
    entityType: 'personas',
    service: PersonaService,
    generate: (entity) => AvatarGeneration.generatePersonaAvatar(entity),
  },
  problems: {
    label: 'Problem',
    entityType: 'problems',
    service: ProblemService,
    generate: (entity) => AvatarGeneration.generateProblemAvatar(entity),
  },
  leias: {
    label: 'Leia',
    entityType: 'leias',
    service: LeiaService,
    generate: (entity) => AvatarGeneration.generateLeiaAvatar(entity),
  },
};

function canModify(entity, context) {
  if (context.role === 'admin' || context.internal) {
    return true;
  }
  return !!entity?.user && entity.user.equals(context.userId);
}

function toGeneratorPayload(entity) {
  if (typeof entity?.toJSON === 'function') {
    return entity.toJSON();
  }
  return entity;
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
      previousAvatarUrl: entity.spec?.avatar,
    });

    entity.set('spec.avatar', storedAvatar.url);
    const updatedEntity = await entity.save();

    if (storedAvatar.previousKey && storedAvatar.previousKey !== storedAvatar.key) {
      await S3Service.deleteObject(storedAvatar.previousKey);
    }

    res.status(200).json({
      avatar: storedAvatar.url,
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
