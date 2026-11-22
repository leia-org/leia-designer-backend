import Joi from 'joi';

const mongoId = Joi.string().hex().length(24).required();
const nameVersion = Joi.object({
  name: Joi.string().required(),
  version: Joi.string()
    .required()
    .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
});

const rubricSpec = Joi.object({
  sections: Joi.array().min(1).items(Joi.object({
    title: Joi.string().required(),
    weight: Joi.number().greater(0).max(100).required(),
    levels: Joi.array().min(1).unique().items(Joi.string().required()).required(),
    criteria: Joi.array().min(1).items(Joi.object({
      name: Joi.string().required(),
      descriptors: Joi.array().min(1).items(Joi.object({
        level: Joi.string().required(),
        description: Joi.string().required(),
      })).required(),
    })).required(),
  })).required(),
});

// Per-LEIA background supervisor, authored by the instructor. Optional; rides
// in the LEIA spec and is denormalized to the workbench (leia.leia.spec).
const supervisorConfig = Joi.object({
  enabled: Joi.boolean().optional(),
  instructions: Joi.string().allow('').optional(),
  categories: Joi.array().items(Joi.string()).optional(),
  sensitivity: Joi.string().valid('low', 'medium', 'high').optional(),
  cadence: Joi.string().valid('everyN', 'onFinish').optional(),
  everyN: Joi.number().integer().min(1).max(50).optional(),
  intervene: Joi.boolean().optional(),
  interveneInstructions: Joi.string().allow('').optional(),
  // The supervisor runs on OpenAI with its own key (independent of the LEIA's
  // provider): the chosen apiKey + its owning user, resolved at runtime (BYOK).
  apiKeyId: Joi.string().hex().length(24).optional(),
  apiKeyRequesterId: Joi.string().hex().length(24).optional(),
  model: Joi.string().allow('', null).optional(),
}).optional();

export const createLeiaValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .optional()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    labels: Joi.array().items(Joi.string().hex().length(24)).optional(),
  }).required(),
  spec: Joi.object({
    persona: Joi.alternatives().try(mongoId, nameVersion).required(),
    behaviour: Joi.alternatives().try(mongoId, nameVersion).required(),
    problem: Joi.alternatives().try(mongoId, nameVersion).required(),
    rubric: Joi.string().hex().length(24).optional(),
    supervisorConfig,
  }).required(),
});

export const updateLeiaValidator = Joi.object({
  apiVersion: Joi.string().required().valid('v1'),
  metadata: Joi.object({
    name: Joi.string().required(),
    version: Joi.string()
      .required()
      .pattern(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    labels: Joi.array().items(Joi.string().hex().length(24)).optional(),
  }).required(),
  spec: Joi.object({
    persona: Joi.alternatives().try(mongoId, nameVersion).required(),
    behaviour: Joi.alternatives().try(mongoId, nameVersion).required(),
    problem: Joi.alternatives().try(mongoId, nameVersion).required(),
    rubric: Joi.string().hex().length(24).optional(),
    supervisorConfig,
  }).required(),
});

export const runnerLeiaValidator = Joi.object({
  spec: Joi.object({
    personaId: mongoId.optional(),
    behaviourId: mongoId.optional(),
    problemId: mongoId.optional(),
    rubricId: mongoId.optional(),
    persona: Joi.object().required(),
    behaviour: Joi.object({
      spec: Joi.object({
        description: Joi.string().required(),
      }).required().unknown(true)
    }).required().unknown(true),
    problem: Joi.object().required(),
    rubric: Joi.object({
      _id: Joi.alternatives().try(Joi.string(), Joi.object()).optional(),
      apiVersion: Joi.string().valid('v1').required(),
      metadata: Joi.object({
        name: Joi.string().required(),
      }).required(),
      spec: Joi.object({
        sections: rubricSpec.extract('sections'),
      }).required(),
    }).optional(),
    supervisorConfig,
    avatar: Joi.string().allow('', null).optional(),
    infographic: Joi.string().allow('', null).optional(),
    infographicSolution: Joi.string().allow('', null).optional(),
  }).required(),
  runnerConfiguration: Joi.object({
    modelName: Joi.string().required(),
    apiKeyId: mongoId.required(),
  }).optional(),
});
