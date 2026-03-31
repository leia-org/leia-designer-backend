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
    const editedUser = await UserRepository.addApiKey(userId, apiKeyData);
    if (!editedUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const newApiKey = editedUser.apiKeys[editedUser.apiKeys.length - 1];
    return newApiKey;
  }

  async deleteApiKey(userId, apiKeyId) {
    const [isDeleted, message] = await UserRepository.deleteApiKey(userId, apiKeyId);
    if (!isDeleted) {
      const error = new Error(message);
      error.statusCode = 404;
      throw error;
    }
    return isDeleted;
  }

  async getApiKeys(userId) {
    const apiKeys = await UserRepository.getApiKeys(userId);
    if (apiKeys === null) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return apiKeys;
  }

  async getApiKeyById(userId, apiKeyId) {
    const apiKey = await UserRepository.getApiKeyById(userId, apiKeyId);
    if (!apiKey) {
      const error = new Error('API Key not found');
      error.statusCode = 404;
      throw error;
    }
    return apiKey;
  }

  async updateApiKey(userId, apiKeyId, apiKeyData) {
    const updatedKey = await UserRepository.updateApiKey(userId, apiKeyId, apiKeyData);
    if (!updatedKey) {
      const error = new Error('API Key not found or does not belong to this user');
      error.statusCode = 404;
      throw error;
    }

    return updatedKey;
  }


}

export default new UserService();
