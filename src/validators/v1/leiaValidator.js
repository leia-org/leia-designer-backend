import Joi from 'joi';

const mongoId = Joi.string().hex().length(24).required();
const nameVersion = Joi.object({
  name: Joi.string().required(),
  version: Joi.string()
    .required()
    .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
});

export const createLeiaValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .optional()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    persona: Joi.alternatives().try(mongoId, nameVersion).required(),
    behaviour: Joi.alternatives().try(mongoId, nameVersion).required(),
    problem: Joi.alternatives().try(mongoId, nameVersion).required(),
  }).required(),
});

export const updateLeiaValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .required()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    persona: Joi.alternatives().try(mongoId, nameVersion).required(),
    behaviour: Joi.alternatives().try(mongoId, nameVersion).required(),
    problem: Joi.alternatives().try(mongoId, nameVersion).required(),
  }).required(),
});

export const runnerLeiaValidator = Joi.object({
  spec: Joi.object({
    personaId: mongoId.optional(),
    behaviourId: mongoId.optional(),
    problemId: mongoId.optional(),
    persona: Joi.object().required(),
    behaviour: Joi.object({
      spec: Joi.object({
        description: Joi.string().required(),
      }).required().unknown(true)
    }).required().unknown(true),
    problem: Joi.object().required(),
  }).required(),
});
