import SystemApiKeyService from '../../services/v1/SystemApiKeyService.js';
import { createSystemApiKeyValidator, updateSystemApiKeyValidator } from '../../validators/v1/systemApiKeyValidator.js';

export const createSystemApiKey = async (req, res, next) => {
  try {
    const value = await createSystemApiKeyValidator.validateAsync(req.body, { abortEarly: false });

    const savedApiKey = await SystemApiKeyService.create(value);
    res.status(201).json(savedApiKey);
  } catch (err) {
    next(err);
  }
};

export const updateSystemApiKey = async (req, res, next) => {
  try {
    const id = req.params.id;
    const value = await updateSystemApiKeyValidator.validateAsync(req.body, { abortEarly: true });
    if (!value.keyValue || value.keyValue === '') {
      delete value.keyValue;
    }

    const updatedKey = await SystemApiKeyService.update(id, value);
    res.json(updatedKey);
  } catch (err) {
    next(err);
  }
};

export const deleteSystemApiKey = async (req, res, next) => {
  try {
    const id = req.params.id;

    await SystemApiKeyService.delete(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};