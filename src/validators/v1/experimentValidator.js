import Joi from 'joi';

export const createExperimentValidator = Joi.object({
  name: Joi.string().required(),
  duration: Joi.number().min(1),
  isActive: Joi.boolean(),
});

export const updateExperimentNameValidator = Joi.object({
  name: Joi.string().required(),
});

export const updateExperimentDurationValidator = Joi.object({
  duration: Joi.number().min(1).required(),
});

export const leiaConfigValidator = Joi.object({
  leia: Joi.string().hex().length(24).required(),
  configuration: Joi.object({
    mode: Joi.string().valid('standard', 'transcription'),
    data: Joi.object(),
  }),
});
