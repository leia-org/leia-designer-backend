import Joi from 'joi';

const PROVIDER_CONFIG = {
  openai: {
    regex: /^sk-[a-zA-Z0-9_-]+$/,
    error: 'La API Key no se corresponde con el formato de OpenAI (debe empezar por "sk-").'
  },
  gemini: {
    regex: /^AIzaSy[a-zA-Z0-9_-]+$/,
    error: 'La API Key no se corresponde con el formato de Gemini (debe empezar por "AIzaSy").'
  },
  anthropic: {
    regex: /^sk-ant-[a-zA-Z0-9_-]+$/,
    error: 'La API Key no se corresponde con el formato de Anthropic (debe empezar por "sk-ant-").'
  }
};

const providerSchema = Joi.string()
  .valid(...Object.keys(PROVIDER_CONFIG))
  .messages({
    'any.only': 'Ese provider no lo gestionamos en el sistema.'
  });

  const keyValueSchema = Joi.string().when('provider', {
  switch: Object.entries(PROVIDER_CONFIG).map(([name, config]) => ({
    is: name,
    then: Joi.string().pattern(config.regex).messages({
      'string.pattern.base': config.error
    })
  }))
});

export const createApiKeyValidator = Joi.object({
  description: Joi.string().required(),
  provider: providerSchema.required(),
  baseUrl: Joi.string().uri().required(),
  keyValue: keyValueSchema.required(),
  managementUrl: Joi.string().uri().allow(null, '').optional(),
  isActive: Joi.boolean().required(),
  isDefault: Joi.boolean().required(),
});

export const updateApiKeyValidator = Joi.object({
  description: Joi.string().optional(),
  provider: providerSchema.optional(),
  baseUrl: Joi.string().uri().optional(),
  keyValue: keyValueSchema.optional().allow(null, ''),
  managementUrl: Joi.string().uri().allow(null, '').optional(),
  isActive: Joi.boolean().optional(),
})
.min(1)
.with('keyValue', 'provider')
.messages({
  'object.with': 'Para actualizar la API Key, es obligatorio enviar también el provider asociado para validarla.'
});
