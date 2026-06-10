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
    const entity = await loadMutableEntity(req, config);
    const generationResult = await config.generate(entity);
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
    generate: (entity) => config.generate(toGeneratorPayload(entity)),
    store: (entity, generationResult) =>
      S3Service.saveAvatar({
        entityType: config.entityType,
        entityId: entity._id.toString(),
        imageDataUrl: generationResult.avatar,
        previousAvatar: entity.spec?.avatar,
      }),
  });
}

function getLeiaInfographicBehaviour(leia) {
  const behaviour = leia.spec?.behaviour;
  if (!behaviour) {
    const error = new Error('Leia behaviour is required');
    error.statusCode = 400;
    throw error;
  }

  return behaviour;
}

async function generateInfographicForLeia(req, res, next, config) {
  await generateStoredImageForEntity(req, res, next, {
    ...config,
    service: LeiaService,
    generate: (leia) => {
      const behaviour = getLeiaInfographicBehaviour(leia);
      return ImageGeneration.generateInfographic(behaviour, config.includeSolution);
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

