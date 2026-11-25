import Joi from 'joi';

export const createExperimentValidator = Joi.object({
  name: Joi.string().required(),
});

export const updateExperimentNameValidator = Joi.object({
  name: Joi.string().required(),
});

export const updateExperimentOrchestrationValidator = Joi.object({
  mode: Joi.string().valid('single', 'multi').required(),
  maxInternalTurns: Joi.number().integer().min(1).max(8).default(2),
  openingLeiaId: Joi.string().hex().length(24).allow(null).default(null),
  problemLeiaId: Joi.string().hex().length(24).allow(null).default(null),
  sharedTask: Joi.string().allow('').max(4000).default(''),
});

const stageId = Joi.string().uuid({ version: 'uuidv4' });

const stageOutputSourcesValidator = Joi.object({
  conversation: stageId.allow(null).default(null),
  submitedSolution: stageId.allow(null).default(null),
  problem: stageId.allow(null).default(null),
});

export const updateExperimentStagesValidator = Joi.object({
  stages: Joi.array().min(1).items(Joi.object({
    id: stageId.required(),
    outputSources: stageOutputSourcesValidator.default({ conversation: null, submitedSolution: null, problem: null }),
    orchestration: updateExperimentOrchestrationValidator.required(),
  })).required(),
});

export const leiaConfigValidator = Joi.object({
  leia: Joi.string().hex().length(24).required(),
  configuration: Joi.object({
    mode: Joi.string().valid('standard', 'transcription'),
    data: Joi.object(),
  }).optional(),
});

export const stagedLeiaConfigValidator = leiaConfigValidator.keys({ stageId });

export const createExperimentReplicationValidator = Joi.object({
  leiaId: Joi.string().hex().length(24).required(),
  leiaName: Joi.string().required(),
});
