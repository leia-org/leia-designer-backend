import Joi from 'joi';

export const createProblemValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .optional()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    description: Joi.string().optional(),
    personaBackground: Joi.string().optional(),
    details: Joi.string().optional(),
    solution: Joi.string().optional(),
    solutionFormat: Joi.string().optional(),
    process: Joi.array().items(Joi.string()),
    extends: Joi.object().optional(),
    overrides: Joi.object().optional(),
    constrainedTo: Joi.object().optional(),
  }).required(),
});

export const updateProblemValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .required()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    description: Joi.string().optional(),
    personaBackground: Joi.string().optional(),
    details: Joi.string().optional(),
    solution: Joi.string().optional(),
    solutionFormat: Joi.string().optional(),
    process: Joi.array().items(Joi.string()),
    extends: Joi.object().optional(),
    overrides: Joi.object().optional(),
    constrainedTo: Joi.object,
  }).required(),
});
