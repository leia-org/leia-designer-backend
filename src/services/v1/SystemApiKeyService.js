import SystemApiKeyRepository from '../../repositories/v1/SystemApiKeyRepository.js';
import UserRepository from '../../repositories/v1/UserRepository.js';
import { decryptApiKeyValue, maskApiKeyValue } from '../../utils/crypto.js';
import axios from 'axios';

class SystemApiKeyService {
  async findAll() {
    const keys = await SystemApiKeyRepository.findAll();
    return keys.map(key => {
      const decrypted = decryptApiKeyValue(key.toObject ? key.toObject({ virtuals: true }) : key);
      return maskApiKeyValue(decrypted);
    });
  }

  async findById(id, maskValue = true) {
    const key = await SystemApiKeyRepository.findById(id);
    if (!key) return null;

    const decrypted = decryptApiKeyValue(key.toObject ? key.toObject({ virtuals: true }) : key);
    return maskValue ? maskApiKeyValue(decrypted) : decrypted;
  }

  async create(userId, data) {
    const newKey = await SystemApiKeyRepository.create(data);
    const decrypted = decryptApiKeyValue(newKey.toObject({ virtuals: true }));
    if (data.isDefault) {
      await UserRepository.setSystemApiKeyDefault(userId, newKey._id);
    }
    return maskApiKeyValue(decrypted);
  }

  async update(id, data) {
    if (data.provider && !data.keyValue) {
      const error = new Error('API Key value is required when updating provider');
      error.statusCode = 400;
      throw error;
    }
    const updatedKey = await SystemApiKeyRepository.update(id, data);
    if (!updatedKey) {
      const error = new Error('System API Key not found');
      error.statusCode = 404;
      throw error;
    }
    const decrypted = decryptApiKeyValue(updatedKey.toObject({ virtuals: true }));
    return maskApiKeyValue(decrypted);
  }

  async delete(id) {
    const result = await SystemApiKeyRepository.delete(id);
    if (!result) {
      const error = new Error('System API Key not found');
      error.statusCode = 404;
      throw error;
    }
    await UserRepository.clearSystemKeyFromAllUsers(id);
    return true;
  }

  async sendRevocationRequestToRunner(apiKeyId) {
    try {
      const config = {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        }
      };

      await axios.post(`${process.env.RUNNER_URL}/api/v1/revoke`, { apiKeyId }, config);
    } catch (err) {
      console.error(`Failed to send revocation request for API Key ${apiKeyId}:`, err.message);
    }
  }
}

export default new SystemApiKeyService();