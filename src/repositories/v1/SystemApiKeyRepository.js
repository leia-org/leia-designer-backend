import SystemApiKey from '../../models/SystemApiKey.js';

class SystemApiKeyRepository {
  async findAll() {
    return await SystemApiKey.find();
  }

  async findById(id) {
    return await SystemApiKey.findById(id);
  }

  async create(data) {
    const systemApiKey = new SystemApiKey(data);
    return await systemApiKey.save();
  }

  async update(id, data) {
    return await SystemApiKey.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await SystemApiKey.findByIdAndDelete(id);
  }
}

export default new SystemApiKeyRepository();