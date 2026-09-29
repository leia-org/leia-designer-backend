import Joi from 'joi';
export const updateExperimentStagesValidator = Joi.object({
  stages: Joi.array().max(100).items(Joi.object({
    id: Joi.string().pattern(/^[\w-]{1,100}$/).required(),
    type: Joi.string().required(), version: Joi.number().integer().valid(1).required(),
    title: Joi.string().max(200).required(), config: Joi.object().unknown(true).required(),
  })).required(),
});

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

export const leiaConfigValidator = Joi.object({
  leia: Joi.string().hex().length(24).required(),
  configuration: Joi.object({
    mode: Joi.string().valid('standard', 'transcription'),
    data: Joi.object(),
  }).optional(),
});

export const createExperimentReplicationValidator = Joi.object({
  leiaId: Joi.string().hex().length(24).required(),
  leiaName: Joi.string().required(),
});
