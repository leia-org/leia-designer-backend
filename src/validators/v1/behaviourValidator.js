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

export const conversationDynamicsValidator = Joi.object().pattern(
  /^[a-z][a-zA-Z0-9]*$/,
  Joi.object({ enabled: Joi.boolean().required(), config: Joi.object().unknown(true).required() })
).keys({
  leiaSpeaksFirst: Joi.object({
    enabled: Joi.boolean().required(),
    config: Joi.when('enabled', { is: true, then: Joi.object({ firstMessage: Joi.string().trim().min(1).required() }).required(), otherwise: Joi.object({ firstMessage: Joi.string().allow('').optional() }).required() }),
  }),
  stoppingCondition: Joi.object({
    enabled: Joi.boolean().required(),
    config: Joi.when('enabled', { is: true, then: Joi.object({ condition: Joi.string().trim().min(1).required() }).required(), otherwise: Joi.object({ condition: Joi.string().allow('').optional() }).required() }),
  }),
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
    conversationDynamics: conversationDynamicsValidator.optional(),
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
    conversationDynamics: conversationDynamicsValidator.optional(),
  }).required(),
});
