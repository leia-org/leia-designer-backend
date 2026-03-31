import User from '../../models/User.js';

class UserRepository {
  // READ METHODS

  async findAll() {
    return await User.find();
  }

  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async existsByEmail(email) {
    return !!(await User.exists({ email }));
  }

  async getApiKeys(userId) {
    const user = await User.findById(userId);
    return user ? user.apiKeys : null;
  }

  async getApiKeyById(userId, apiKeyId) {
    const user = await User.findById(userId);
    if (!user) return null;
    return user.apiKeys.id(apiKeyId);
  }

  // WRITE METHODS

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async update(id, userData) {
    return await User.findByIdAndUpdate(id, userData, { new: true });
  }

  async addApiKey(userId, apiKeyData) {
    return await User.findByIdAndUpdate(
      userId,
      { $push: { apiKeys: apiKeyData } },
      { new: true }
    );
  }

  async updateApiKey(userId, apiKeyId, apiKeyData) {
    const user = await User.findById(userId);
    if (!user) return null;

    const apiKey = user.apiKeys.id(apiKeyId);
    if (!apiKey) return null;
    // eslint-disable-next-line no-unused-vars
    const { _id, id, createdAt, updatedAt, ...safeData } = apiKeyData;
    apiKey.set(safeData);
    await user.save();
    return apiKey;
  }

  // DELETE METHODS

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }

  async deleteApiKey(userId, apiKeyId) {
      const result = await User.updateOne(
        {
          _id: userId,
          "apiKeys._id": apiKeyId
        },
        {
          $pull: { apiKeys: { _id: apiKeyId } }
        }
      );
      if (result.modifiedCount > 0) {
          return [true, "API Key deleted successfully"];
        }
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        return [false, "User not found"];
      } else {
        return [false, "API Key not found"];
      }
    }
}

export default new UserRepository();
