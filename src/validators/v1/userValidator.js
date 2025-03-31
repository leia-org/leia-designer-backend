import Joi from 'joi';

export const createUserValidator = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid('admin', 'instructor').required(),
});

export const updateUserValidator = Joi.object({
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'instructor').optional(),
  password: Joi.string().optional(),
});

export const loginUserValidator = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
