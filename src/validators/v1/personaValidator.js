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
    fullName: Joi.string().optional().allow(''),
    firstName: Joi.string().optional().allow(''),
    description: Joi.string().optional().allow(''),
    personality: Joi.string().optional().allow(''),
    subjectPronoum: Joi.string().optional().allow(''),
    objectPronoum: Joi.string().optional().allow(''),
    possesivePronoum: Joi.string().optional().allow(''),
    possesiveAdjective: Joi.string().optional().allow(''),
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
    fullName: Joi.string().optional().allow(''),
    firstName: Joi.string().optional().allow(''),
    description: Joi.string().optional().allow(''),
    personality: Joi.string().optional().allow(''),
    subjectPronoum: Joi.string().optional().allow(''),
    objectPronoum: Joi.string().optional().allow(''),
    possesivePronoum: Joi.string().optional().allow(''),
    possesiveAdjective: Joi.string().optional().allow(''),
  }).required(),
});
