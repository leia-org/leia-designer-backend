import LeiaDraft from '../../models/LeiaDraft.js';

class LeiaDraftRepository {
  async findByUser(userId) {
    return await LeiaDraft.find({ user: userId }).sort({ updatedAt: -1 });
  }

  async findById(id) {
    return await LeiaDraft.findById(id);
  }

  async create(data) {
    const draft = new LeiaDraft(data);
    return await draft.save();
  }

  async update(id, data) {
    return await LeiaDraft.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id) {
    return await LeiaDraft.findByIdAndDelete(id);
  }
}

export default new LeiaDraftRepository();
