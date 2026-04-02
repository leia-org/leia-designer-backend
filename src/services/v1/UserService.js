import UserRepository from '../../repositories/v1/UserRepository.js';

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

    const editedUser = await UserRepository.addApiKey(userId, apiKeyData);
    if (!editedUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const newApiKey = editedUser.apiKeys[editedUser.apiKeys.length - 1];
    if (apiKeyData.isDefault) {
      await this.markKeyAsDefault(userId, newApiKey._id);
    }
    return newApiKey;
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
    if (user.useSystemApiKey) {
      const systemApiKey = this.#getSystemApiKey(user);
      if (systemApiKey) {
        return [systemApiKey, ...user.apiKeys];
      }
    }
    return user.apiKeys;
  }

  #getSystemApiKey(user) {
    const systemApiKey = {
      _id: process.env.SYSTEM_API_KEY_ID,
      id: process.env.SYSTEM_API_KEY_ID,
      description: process.env.SYSTEM_API_KEY_DESCRIPTION || 'System API Key',
      modelName: process.env.SYSTEM_API_KEY_MODEL_NAME,
      keyValue: process.env.SYSTEM_API_KEY_VALUE,
      isActive: true,
      isDefault: user.isSystemApiKeyDefault,
      baseUrl: process.env.SYSTEM_API_KEY_BASE_URL,
      isSystemApiKey: true,
    };

    if (systemApiKey._id && systemApiKey.modelName && systemApiKey.keyValue && systemApiKey.baseUrl) {
      return systemApiKey;
    }
    return null;
  }

  async getApiKeyById(userId, apiKeyId) {
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
    if (apiKeyId === process.env.SYSTEM_API_KEY_ID) {
      if (!user.useSystemApiKey) {
        const error = new Error('User does not have access to the system API key');
        error.statusCode = 404;
        throw error;
      }
      return this.#getSystemApiKey(user);
    } else {
      const apiKey = user.apiKeys.id(apiKeyId);
      if (!apiKey) {
        const error = new Error('API Key not found');
        error.statusCode = 404;
        throw error;
      }
      return apiKey;
  }
  }

  async updateApiKey(userId, apiKeyId, apiKeyData) {
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    const updatedKey = await UserRepository.updateApiKey(userId, apiKeyId, apiKeyData);
    if (!updatedKey) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return updatedKey;
  }

  async markKeyAsDefault(userId, apiKeyId) {
    if (apiKeyId === process.env.SYSTEM_API_KEY_ID) {
      // mark system api key as default atomically
      const updatedUser = await UserRepository.setSystemApiKeyDefault(userId, true);
      if (!updatedUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      return this.#getSystemApiKey(updatedUser);
    }

    // atomically mark the embedded apiKey as default and clear others
    const updatedUser = await UserRepository.markApiKeyAsDefault(userId, apiKeyId);
    if (!updatedUser) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    const apiKey = updatedUser.apiKeys.find(k => String(k._id) === String(apiKeyId));
    if (!apiKey) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return apiKey;
  }

  async unMarkDefaultKey(userId, apiKeyId) {
    if (apiKeyId === process.env.SYSTEM_API_KEY_ID) {
      const updatedUser = await UserRepository.setSystemApiKeyDefault(userId, false);
      if (!updatedUser) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }
      return this.#getSystemApiKey(updatedUser);
    }

    const updatedUser = await UserRepository.unmarkApiKeyDefault(userId, apiKeyId);
    if (!updatedUser) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    const apiKey = updatedUser.apiKeys.find(k => String(k._id) === String(apiKeyId));
    if (!apiKey) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return apiKey;
  }
}

export default new UserService();
