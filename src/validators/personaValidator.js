import Joi from 'joi';

export const createPersonaValidator = Joi.object({
  name: Joi.string().required(),
  fullName: Joi.string().optional(),
  firstName: Joi.string().optional(),
  description: Joi.string().optional(),
  personality: Joi.string().optional(),
  subjectPronoum: Joi.string().optional(),
  objectPronoum: Joi.string().optional(),
  possesivePronoum: Joi.string().optional(),
  possesiveAdjective: Joi.string().optional(),
});

export const updatePersonaValidator = Joi.object({
  name: Joi.string().optional(),
  fullName: Joi.string().optional(),
  firstName: Joi.string().optional(),
  description: Joi.string().optional(),
  personality: Joi.string().optional(),
  subjectPronoum: Joi.string().optional(),
  objectPronoum: Joi.string().optional(),
  possesivePronoum: Joi.string().optional(),
  possesiveAdjective: Joi.string().optional(),
  // For update, versionType is required since it indicates how the version should be incremented.
  versionType: Joi.string().valid('major', 'minor', 'patch').required(),
});
