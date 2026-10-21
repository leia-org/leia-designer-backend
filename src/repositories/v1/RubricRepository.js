import Rubric from '../../models/Rubric.js';

class RubricRepository {
  async findByOwner(userId) {
    return await Rubric.find({ user: userId }).sort({ updatedAt: -1 });
  }

  async findOwnedById(id, userId) {
    return await Rubric.findOne({ _id: id, user: userId });
  }

  async create(rubricData) {
    const rubric = new Rubric(rubricData);
    return await rubric.save();
  }

  async updateOwnedById(id, userId, rubricData) {
    return await Rubric.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: rubricData },
      { new: true, runValidators: true },
    );
  }

  async deleteOwnedById(id, userId) {
    return await Rubric.findOneAndDelete({ _id: id, user: userId });
  }
}

export default new RubricRepository();
