import Experiment from '../../models/Experiment.js';
import mongoose from 'mongoose';
import { regexQuery } from '../../utils/search.js';
import { stageError } from '../../utils/activityStages.js';
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

  async findAccessible(userId, ownedOnly = false, lastActivityId, text) {
    const query = ownedOnly ? { user: userId } : { $or: [{ user: userId }, { isPublished: true }] };
    if (lastActivityId) query._id = { $gt: new mongoose.Types.ObjectId(lastActivityId) };
    if (text) Object.assign(query, regexQuery(text, 'name'));
    const limit = 10;
    const results = await Experiment.find(query).sort({ _id: 1 }).populate('leias.leia').limit(limit + 1);
    const experiments = results.slice(0, limit);
    const nextCursor = results.length > limit ? experiments[experiments.length - 1].id : null;
    return { experiments, nextCursor };
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

  async updateStagedDraft(experiment, changes) {
    const updated = await Experiment.findOneAndUpdate(
      { _id: experiment.id, __v: experiment.__v, isPublished: false },
      { $set: changes, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    ).populate('leias.leia');
    if (!updated) throw stageError('The activity changed. Reload it and try again.', 409);
    return updated;
  }

  async toggleIsActive(id) {
    return await Experiment.findByIdAndUpdate(
      id,
      { $set: { isActive: { $not: '$isActive' } } },
      { new: true }
    ).populate('leias.leia');
  }

  // DELETE METHODS

  async deleteById(id) {
    return await Experiment.findByIdAndDelete(id);
  }

}

export default new ExperimentRepository();
