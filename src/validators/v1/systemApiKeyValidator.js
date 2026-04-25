import Joi from 'joi';

export const createSystemApiKeyValidator = Joi.object({
  description: Joi.string().required(),
  modelName: Joi.string().required(),
  baseUrl: Joi.string().uri().required(),
  keyValue: Joi.string().required(),
  managementUrl: Joi.string().uri().allow(null, '').optional(),
  isActive: Joi.boolean().optional(),
});

export const updateSystemApiKeyValidator = Joi.object({
  description: Joi.string().optional(),
  modelName: Joi.string().optional(),
  baseUrl: Joi.string().uri().optional(),
  keyValue: Joi.string().optional().allow(null, ''),
  managementUrl: Joi.string().uri().allow(null, '').optional(),
  isActive: Joi.boolean().optional(),
});