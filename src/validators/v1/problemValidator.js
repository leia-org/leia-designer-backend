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
    initialSolution: Joi.string().optional(),
    solutionFormat: Joi.string().optional().valid('text', 'mermaid', 'yaml', 'markdown', 'html', 'json', 'xml'),
    process: processValidator,
    evaluationPrompt: Joi.string().optional(),
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
    initialSolution: Joi.string().optional(),
    solutionFormat: Joi.string().optional().valid('text', 'mermaid', 'yaml', 'markdown', 'html', 'json', 'xml'),
    process: processValidator,
    evaluationPrompt: Joi.string().optional(),
    extends: Joi.object().optional(),
    overrides: Joi.object().optional(),
    constrainedTo: Joi.object().optional(),
  }).required(),
});
