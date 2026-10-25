import Experiment from '../../models/Experiment.js';
import mongoose from 'mongoose';
import { regexQuery } from '../../utils/search.js';
class ExperimentRepository {
  // READ METHODS

  async findAll(lastActivityId, text) {
    const query = {};
    if (lastActivityId) {
      query._id = { $gt: new mongoose.Types.ObjectId(`${lastActivityId}`) };;
    }
    if (text) {
      Object.assign(query, regexQuery(text, 'name'));
    }
    const limit = 15;
    const results =  await Experiment.find(query).sort({ _id: 1 }).populate('leias.leia').limit(limit+1);
    const experiments = results.slice(0, limit);
    const nextCursor = experiments.length === limit ? experiments[experiments.length - 1].id : null;
    return {experiments, nextCursor}
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

  async findByUserId(userId, visibility = 'all', populated = false, lastActivityId, text) {
    const query = { user: userId };
    if (visibility === 'public') {
      query.isPublished = true;
    } else if (visibility === 'private') {
      query.isPublished = false;
    }
    if (lastActivityId) {
      query._id = { $gt: new mongoose.Types.ObjectId(`${lastActivityId}`) };;
    }
    if (text) {
      Object.assign(query, regexQuery(text, 'name'));
    }
    const limit = 10;
    const results = populated ? await Experiment.find(query).sort({ _id: 1 }).populate('leias.leia').limit(limit+1) : await Experiment.find(query).sort({ _id: 1 }).limit(limit+1);
    const experiments = results.slice(0, limit);
    const nextCursor = experiments.length === limit ? experiments[experiments.length - 1].id : null;
    return {experiments, nextCursor};
  }

  async existsByName(name) {
  return await Experiment.exists({ name });
  }
  // WRITE METHODS

  async create(experimentData) {
    const experiment = new Experiment(experimentData);
    return await experiment.save();
  }

  async update(id, experimentData) {
    return await Experiment.findByIdAndUpdate(id, experimentData, { new: true }).populate('leias.leia');
  }

  async updateOrchestration(id, orchestration) {
    return await Experiment.findByIdAndUpdate(
      id,
      { $set: { orchestration } },
      { new: true }
    ).populate('leias.leia');
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
      { $set: { 'leias.$': { ...leiaConfig, _id: leiaConfigId } } },
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

  // DELETE METHODS

  async deleteById(id) {
    return await Experiment.findByIdAndDelete(id);
  }

}

export default new ExperimentRepository();
