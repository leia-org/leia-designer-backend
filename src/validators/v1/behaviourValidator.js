import Joi from 'joi';

const processValidator = Joi.array()
  .items(Joi.string().valid('requirements-elicitation', 'game', 'other'))
  .custom((value, helpers) => {
    if (Array.isArray(value) && value.includes('other') && value.length > 1) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'Other process exclusivity validation')
  .messages({
    'any.invalid': "When 'other' is selected in process, it must be the only value.",
  });

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
    process: processValidator,
    tooltip: Joi.string().optional(),
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
    process: processValidator,
    tooltip: Joi.string().optional(),
  }).required(),
});
