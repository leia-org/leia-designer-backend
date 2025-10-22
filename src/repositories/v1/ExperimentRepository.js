import Experiment from '../../models/Experiment.js';

class ExperimentRepository {
  // READ METHODS

  async findAll() {
    return await Experiment.find();
  }

  async findById(id) {
    return await Experiment.findById(id);
  }

  async findByIdPopulated(id) {
    return await Experiment.findById(id).populate('leias.leia');
  }

  async existsByLeiaId(leiaId) {
    return !!(await Experiment.exists({ 'leias.leia': leiaId }));
  }

  async findByLeiaId(leiaId) {
    return await Experiment.find({ 'leias.leia': leiaId });
  }

  async findByUserId(userId, visibility = 'all', populated = false) {
    const query = { user: userId };
    if (visibility === 'public') {
      query.isPublished = true;
    } else if (visibility === 'private') {
      query.isPublished = false;
    }
    return populated ? await Experiment.find(query).populate('leias.leia') : await Experiment.find(query);
  }

  // WRITE METHODS

  async create(experimentData) {
    const experiment = new Experiment(experimentData);
    return await experiment.save();
  }

  async update(id, experimentData) {
    return await Experiment.findByIdAndUpdate(id, experimentData, { new: true }).populate('leias.leia');
  }

  async regenerateCode(id) {
    const experiment = await Experiment.findById(id).populate('leias.leia');
    if (!experiment) {
      throw new Error('Experiment not found');
    }
    await experiment.regenerateCode();
    return await experiment.save();
  }

  async toggleIsActive(id) {
    return await Experiment.findByIdAndUpdate(
      id,
      { $set: { isActive: { $not: '$isActive' } } },
      { new: true }
    ).populate('leias.leia');
  }

  async addLeia(experimentId, leiaConfig) {
    return await Experiment.findByIdAndUpdate(experimentId, { $push: { leias: leiaConfig } }, { new: true }).populate(
      'leias.leia'
    );
  }

  async updateLeia(experimentId, leiaConfigId, leiaConfig) {
    return await Experiment.findOneAndUpdate(
      { _id: experimentId, 'leias._id': leiaConfigId },
      { $set: { 'leias.$': leiaConfig } },
      { new: true }
    ).populate('leias.leia');
  }

  async deleteLeia(experimentId, leiaConfigId) {
    return await Experiment.findByIdAndUpdate(
      experimentId,
      { $pull: { leias: { _id: leiaConfigId } } },
      { new: true }
    ).populate('leias.leia');
  }
}

export default new ExperimentRepository();
