import SystemApiKeyRepository from '../../repositories/v1/SystemApiKeyRepository.js';
import { decryptApiKeyValue, maskApiKeyValue } from '../../utils/crypto.js';

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

  async create(data) {
    const newKey = await SystemApiKeyRepository.create(data);
    const decrypted = decryptApiKeyValue(newKey.toObject({ virtuals: true }));
    return maskApiKeyValue(decrypted);
  }

  async update(id, data) {
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
    return true;
  }
}

export default new SystemApiKeyService();