import UserService from '../../services/v1/UserService.js';
import { createUserValidator, updateUserValidator, loginUserValidator } from '../../validators/v1/userValidator.js';
import { createApiKeyValidator, updateApiKeyValidator } from '../../validators/v1/apiKeyValidator.js';
import { generateToken } from '../../utils/jwt.js';
import SystemApiKeyService from '../../services/v1/SystemApiKeyService.js';
import ProviderService from '../../services/v1/ProviderService.js';

// No authentication required
export const login = async (req, res, next) => {
  try {
    const value = await loginUserValidator.validateAsync(req.body, { abortEarly: false });

    const user = await UserService.login(value.email, value.password);
    const token = generateToken(user.toJSON());
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

// Admin access managed by middleware in routes
export const createUser = async (req, res, next) => {
  try {
    const value = await createUserValidator.validateAsync(req.body, { abortEarly: false });

    const savedUser = await UserService.create(value);
    res.status(201).json(savedUser);
  } catch (err) {
    next(err);
  }
};

// Admin access managed by middleware in routes
export const getUserById = async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params.id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Admin access managed by middleware in routes
export const getUsers = async (req, res, next) => {
  try {
    const users = await UserService.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Custom authorization check
export const updateUser = async (req, res, next) => {
  try {
    const value = await updateUserValidator.validateAsync(req.body, { abortEarly: false });

    const id = req.params.id;

    if ((id !== req.auth?.payload?.id || value.role) && req.auth?.payload?.role !== 'admin') {
      const error = new Error('Unauthorized: Admin access required');
      error.statusCode = 403;
      throw error;
    }

    const updatedUser = await UserService.update(id, value);
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const id = req.params.id;

    await UserService.delete(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getUserByEmail = async (req, res, next) => {
  try {
    const user = await UserService.findByEmail(req.params.email);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { email } = req.body;
    const userId = req.auth?.payload?.id;

    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const updatedUser = await UserService.updateProfile(userId, email);
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.auth?.payload?.id;

    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required');
      error.statusCode = 400;
      throw error;
    }

    if (newPassword.length < 6) {
      const error = new Error('New password must be at least 6 characters');
      error.statusCode = 400;
      throw error;
    }

    await UserService.changePassword(userId, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

export const createApiKey = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const value = await createApiKeyValidator.validateAsync(req.body, { abortEarly: false });
    await ProviderService.verifyApiKeyIntegrity(value.provider, value.keyValue);
    const savedApiKey = await UserService.createApiKey(userId, value);
    res.status(201).json(savedApiKey);
  }catch (err) {
    if (err.message.startsWith('Invalid API Key') || err.message.includes('service is not available')) {
      err.isJoi = true;
      err.details = [{
        path: ['keyValue'],
        message: err.message,
      }];
    }
    next(err);
  }
}

export const getApiKeys = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const apiKeys = await UserService.getApiKeys(userId);
    res.json(apiKeys);
  } catch (err) {
    next(err);
  }
}

export const deleteApiKey = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const apiKeyId = req.params.apiKeyId;
    await UserService.deleteApiKey(userId, apiKeyId);
    await SystemApiKeyService.sendRevocationRequestToRunner(apiKeyId);
    res.status(204).end();
  }
  catch (err) {    next(err);
  }
}

export const updateApiKey = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const apiKeyId = req.params.apiKeyId;
    const value = await updateApiKeyValidator.validateAsync(req.body, { abortEarly: true });
    if (value.keyValue && value.keyValue !== '') {
        await ProviderService.verifyApiKeyIntegrity(value.provider, value.keyValue);
    } else {
        delete value.keyValue;
    }
    const updatedKey = await UserService.updateApiKey(userId, apiKeyId, value);
    await SystemApiKeyService.sendRevocationRequestToRunner(updatedKey._id);
    res.json(updatedKey);
  }
  catch (err) {
    if (err.message.startsWith('Invalid API Key') || err.message.includes('service is not available')) {
        err.isJoi = true;
        err.details = [{
          path: ['keyValue'],
          message: err.message,
        }];
      }
    next(err);
  }
}

export const manageDefaultKey = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const apiKeyId = req.params.apiKeyId;
    const apiKey = await UserService.getApiKeyById(userId, apiKeyId);
    let updatedKey = null;
    if (apiKey.isDefault) {
      updatedKey = await UserService.unMarkDefaultKey(userId, apiKeyId);
      }else {
      updatedKey = await UserService.markKeyAsDefault(userId, apiKeyId);
     }
     res.json(updatedKey);
  }
  catch (err) {
    next(err);
  }
}

export const getApiKeyById = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const apiKeyId = req.params.apiKeyId;
    const apiKey = await UserService.getApiKeyById(userId, apiKeyId);
    res.json(apiKey);
  }
  catch (err) {
    next(err);
  }
}

export const getApiKeyValueForLeiaRunner = async (req, res, next) => {
  try {
    const { provider, apiKeyId, apiKeyRequesterId } = req.body;
    const apiKey = await UserService.getApiKeyById(apiKeyRequesterId, apiKeyId, false);
    if (!apiKey) {
      const error = new Error('API Key not found');
      error.statusCode = 404;
      throw error;
    }
    if (apiKey.provider !== provider) {
      const error = new Error('API Key provider mismatch');
      error.statusCode = 400;
      throw error;
    }

    res.json({ keyValue: apiKey.keyValue });
  }
    catch (err) {
    next(err);
  }
}
