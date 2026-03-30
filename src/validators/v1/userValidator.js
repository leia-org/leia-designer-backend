import Joi from 'joi';

export const createUserValidator = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid('admin', 'instructor', 'advanced').required(),
});

export const updateUserValidator = Joi.object({
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'instructor', 'advanced').optional(),
  password: Joi.string().optional(),
});

export const loginUserValidator = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createApiKeyValidator = Joi.object({
  description: Joi.string().required(),
  modelName: Joi.string().required(),
  baseUrl: Joi.string().uri().required(),
  keyValue: Joi.string().required(),
  managementUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().required(),
  isDefault: Joi.boolean().required(),
});

export const updateApiKeyValidator = Joi.object({
  description: Joi.string().optional(),
  modelName: Joi.string().optional(),
  baseUrl: Joi.string().uri().optional(),
  keyValue: Joi.string().optional(),
  managementUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
  isDefault: Joi.boolean().optional(),
});
