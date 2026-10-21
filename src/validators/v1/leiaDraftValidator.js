import Joi from 'joi';

const state = Joi.object().unknown(true).required();

export const createLeiaDraftValidator = Joi.object({
  title: Joi.string().trim().max(160).allow('').default('Untitled LEIA'),
  state,
});

export const updateLeiaDraftValidator = Joi.object({
  title: Joi.string().trim().max(160).allow(''),
  state: Joi.object().unknown(true),
}).min(1);
