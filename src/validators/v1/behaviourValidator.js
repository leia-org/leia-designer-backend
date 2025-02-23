import Joi from 'joi';

export const createBehaviourValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .optional()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    description: Joi.string().optional(),
    role: Joi.string().optional(),
    process: Joi.array().items(Joi.string()),
  }).required(),
});

export const updateBehaviourValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .required()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    description: Joi.string().optional(),
    role: Joi.string().optional(),
    process: Joi.array().items(Joi.string()),
  }).required(),
});
