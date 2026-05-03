import UserRepository from '../../repositories/v1/UserRepository.js';
import SystemApiKeyService from './SystemApiKeyService.js';
import { encrypt, decryptApiKeyValue, maskApiKeyValue } from '../../utils/crypto.js';


class UserService {
  async findAll() {
    return await UserRepository.findAll();
  }

  async findById(id) {
    return await UserRepository.findById(id);
  }

  async findByEmail(email) {
    return await UserRepository.findByEmail(email);
  }

  async existsByEmail(email) {
    return await UserRepository.existsByEmail(email);
  }

  async create(userData) {
    return await UserRepository.create(userData);
  }

  async update(id, userData) {
    return await UserRepository.update(id, userData);
  }

  async delete(id) {
    return await UserRepository.delete(id);
  }

  async login(email, password) {
    const user = await UserRepository.findByEmail(email);

    if (!user || !(await user.isCorrectPassword(password))) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    return user;
  }

  async updateProfile(id, email) {
    // Check if email is already taken by another user
    if (email) {
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser && existingUser.id !== id) {
        const error = new Error('Email already in use');
        error.statusCode = 400;
        throw error;
      }
    }

    return await UserRepository.update(id, { email });
  }

  async changePassword(id, currentPassword, newPassword) {
    const user = await UserRepository.findById(id);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isCorrect = await user.isCorrectPassword(currentPassword);
    if (!isCorrect) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 400;
      throw error;
    }

    // Update password
    return await UserRepository.update(id, { password: newPassword });
  }


  async createApiKey(userId, apiKeyData) {
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }
    apiKeyData.keyValue = encrypt(apiKeyData.keyValue);
    const editedUser = await UserRepository.addApiKey(userId, apiKeyData);
    if (!editedUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const newApiKey = editedUser.apiKeys[editedUser.apiKeys.length - 1];
    console.log('New API Key created with ID:', newApiKey);
    if (apiKeyData.isDefault) {
      await this.markKeyAsDefault(userId, newApiKey._id);
    }
    return this.getApiKeyById(userId, newApiKey._id);
  }

  async deleteApiKey(userId, apiKeyId) {
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const [isDeleted, message] = await UserRepository.deleteApiKey(userId, apiKeyId);
    if (!isDeleted) {
      const error = new Error(message);
      error.statusCode = 404;
      throw error;
    }
    return isDeleted;
  }

  async getApiKeys(userId) {
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const apiKeys = user.apiKeys.map(apiKey => {
      const decrypted = decryptApiKeyValue(apiKey.toObject({virtuals: true}));
      return maskApiKeyValue(decrypted);
    });

    if (user.useSystemApiKey) {
      const systemKeysDocs = await SystemApiKeyService.findAll();
      const systemApiKeys = systemKeysDocs.map(sysKey => {
        sysKey.isDefault = user.defaultSystemApiKeyId && user.defaultSystemApiKeyId.toString() === sysKey._id.toString();
        return sysKey;
      });

      return [...systemApiKeys, ...apiKeys];
    }

    return apiKeys;
  }

  async getApiKeyById(userId, apiKeyId, maskValue = true) {
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }
    const user = await UserRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const systemKey = await SystemApiKeyService.findById(apiKeyId, maskValue);
    if (systemKey) {
      if (!user.useSystemApiKey) {
        const error = new Error('User does not have access to the system API keys');
        error.statusCode = 403;
        throw error;
      }
      systemKey.isDefault = user.defaultSystemApiKeyId && user.defaultSystemApiKeyId.toString() === systemKey._id.toString();
      return systemKey;
    }
    const apiKey = user.apiKeys.id(apiKeyId);
    if (!apiKey) {
      const error = new Error('API Key not found');
      error.statusCode = 404;
      throw error;
    }
    const decryptedApiKey = decryptApiKeyValue(apiKey.toObject({virtuals: true}));
    return maskValue ? maskApiKeyValue(decryptedApiKey) : decryptedApiKey;
  }

  async updateApiKey(userId, apiKeyId, apiKeyData) {
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }
    if (apiKeyData.provider && !apiKeyData.keyValue) {
      const error = new Error('API Key value is required when updating provider');
      error.statusCode = 400;
      throw error;
    }
    if (apiKeyData.keyValue) {
      apiKeyData.keyValue = encrypt(apiKeyData.keyValue);
    }
    const updatedKey = await UserRepository.updateApiKey(userId, apiKeyId, apiKeyData);
    if (!updatedKey) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return this.getApiKeyById(userId, apiKeyId);
  }
  async markKeyAsDefault(userId, apiKeyId) {
    const systemKey = await SystemApiKeyService.findById(apiKeyId);

    if (systemKey) {
      const updatedUser = await UserRepository.setSystemApiKeyDefault(userId, apiKeyId, true);
      if (!updatedUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      return this.getApiKeyById(userId, apiKeyId);
    }

    const updatedUser = await UserRepository.markApiKeyAsDefault(userId, apiKeyId);
    if (!updatedUser) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return this.getApiKeyById(userId, apiKeyId);
  }

  async unMarkDefaultKey(userId, apiKeyId) {
    const systemKey = await SystemApiKeyService.findById(apiKeyId);

    if (systemKey) {
      const updatedUser = await UserRepository.setSystemApiKeyDefault(userId, apiKeyId, false);
      if (!updatedUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      return this.getApiKeyById(userId, apiKeyId);
    }

    const updatedUser = await UserRepository.unmarkApiKeyDefault(userId, apiKeyId);
    if (!updatedUser) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return this.getApiKeyById(userId, apiKeyId);
  }

}

export default new UserService();
