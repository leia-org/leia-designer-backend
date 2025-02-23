import Joi from 'joi';

export const createPersonaValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .optional()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    fullName: Joi.string().optional(),
    firstName: Joi.string().optional(),
    description: Joi.string().optional(),
    personality: Joi.string().optional(),
    subjectPronoum: Joi.string().optional(),
    objectPronoum: Joi.string().optional(),
    possesivePronoum: Joi.string().optional(),
    possesiveAdjective: Joi.string().optional(),
  }).required(),
});

export const updatePersonaValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .required()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  }).required(),
  spec: Joi.object({
    fullName: Joi.string().optional(),
    firstName: Joi.string().optional(),
    description: Joi.string().optional(),
    personality: Joi.string().optional(),
    subjectPronoum: Joi.string().optional(),
    objectPronoum: Joi.string().optional(),
    possesivePronoum: Joi.string().optional(),
    possesiveAdjective: Joi.string().optional(),
  }).required(),
});
