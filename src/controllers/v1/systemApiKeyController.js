import SystemApiKeyService from '../../services/v1/SystemApiKeyService.js';
import ProviderService from '../../services/v1/ProviderService.js';
import { createApiKeyValidator, updateApiKeyValidator } from '../../validators/v1/apiKeyValidator.js';

export const createSystemApiKey = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const value = await createApiKeyValidator.validateAsync(req.body, { abortEarly: false });
    await ProviderService.verifyApiKeyIntegrity(value.provider, value.keyValue);
    const savedApiKey = await SystemApiKeyService.create(userId, value);
    res.status(201).json(savedApiKey);
  } catch (err) {
    if (err.message.startsWith('Invalid API Key') || err.message.includes('service is not available')) {
        err.isJoi = true;
        err.details = [{
          path: ['keyValue'],
          message: err.message,
        }];
      }
    next(err);
  }
};

export const updateSystemApiKey = async (req, res, next) => {
  try {
    const id = req.params.id;
    const value = await updateApiKeyValidator.validateAsync(req.body, { abortEarly: true });
    if (value.keyValue && value.keyValue !== '') {
        await ProviderService.verifyApiKeyIntegrity(value.provider, value.keyValue);
    } else {
        delete value.keyValue;
    }
    const updatedKey = await SystemApiKeyService.update(id, value);
    await SystemApiKeyService.sendRevocationRequestToRunner(updatedKey._id);
    res.json(updatedKey);
  } catch (err) {
    if (err.message.startsWith('Invalid API Key') || err.message.includes('service is not available')) {
        err.isJoi = true;
        err.details = [{
          path: ['keyValue'],
          message: err.message,
        }];
      }
    next(err);
  }
};

export const deleteSystemApiKey = async (req, res, next) => {
  try {
    const id = req.params.id;

    await SystemApiKeyService.delete(id);
    await SystemApiKeyService.sendRevocationRequestToRunner(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};