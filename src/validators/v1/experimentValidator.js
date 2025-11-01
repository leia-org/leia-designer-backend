import Joi from 'joi';

export const createExperimentValidator = Joi.object({
  name: Joi.string().required(),
});

export const updateExperimentNameValidator = Joi.object({
  name: Joi.string().required(),
});

export const leiaConfigValidator = Joi.object({
  leia: Joi.string().hex().length(24).required(),
  configuration: Joi.object({
    mode: Joi.string().valid('standard', 'transcription'),
    audioMode: Joi.string().valid('realtime', null).allow(null).optional(),
    realtimeConfig: Joi.object({
      model: Joi.string().optional().default('gpt-4o-realtime-preview'),
      voice: Joi.string()
        .valid('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'marin')
        .optional()
        .default('marin'),
      instructions: Joi.string().allow('').optional(),
      turnDetection: Joi.object({
        type: Joi.string().valid('server_vad', 'none').optional().default('server_vad'),
        threshold: Joi.number().min(0).max(1).optional().default(0.5),
        prefix_padding_ms: Joi.number().optional().default(300),
        silence_duration_ms: Joi.number().optional().default(500),
      }).optional(),
    }).optional(),
    data: Joi.object(),
  }).optional(),
});
