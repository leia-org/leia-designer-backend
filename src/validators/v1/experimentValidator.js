import Joi from 'joi';

export const createExperimentValidator = Joi.object({
  name: Joi.string().required(),
});

export const updateExperimentNameValidator = Joi.object({
  name: Joi.string().required(),
});

export const updateExperimentOrchestrationValidator = Joi.object({
  mode: Joi.string().valid('single', 'multi').required(),
  maxInternalTurns: Joi.number().integer().min(2).max(5).default(2),
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
