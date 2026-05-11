import Joi from 'joi';

export const createLabelValidator = Joi.object({
  name: Joi.string().required(),
  color: Joi.string().required(),
  secundaryColor: Joi.string().required(),
  user: Joi.string().hex().length(24).required(),
  isGlobal: Joi.boolean().optional(),
});

export const updateLabelValidator = Joi.object({
  name: Joi.string().optional(),
  color: Joi.string().optional(),
  secundaryColor: Joi.string().optional(),
  isGlobal: Joi.boolean().optional(),
});