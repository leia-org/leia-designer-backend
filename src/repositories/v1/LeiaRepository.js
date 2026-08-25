import Leia from '../../models/Leia.js';
import mongoose from 'mongoose';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';
import { applyVisibilityFilters } from '../../utils/entity.js';
import { regexQuery } from '../../utils/search.js';

class LeiaRepository {
  // READ METHODS

  async findAll() {
    return await Leia.find();
  }

  async findById(id) {
    return await Leia.findById(id);
  }
  
  async findByIdAndUpdate(id, updateData) {
    return await Leia.findByIdAndUpdate(id, updateData, { new: true}).populate('metadata.labels');
  }

  async existsByName(name) {
    return !!(await Leia.exists({ 'metadata.name': name }));
  }

  async existsByPersonaId(personaId) {
    return !!(await Leia.exists({ 'spec.personaId': personaId }));
  }

  async findByPersonaId(personaId) {
    return await Leia.find({ 'spec.personaId': personaId });
  }

  async existsByProblemId(problemId) {
    return !!(await Leia.exists({ 'spec.problemId': problemId }));
  }

  async findByProblemId(problemId) {
    return await Leia.find({ 'spec.problemId': problemId });
  }

  async existsByBehaviourId(behaviourId) {
    return !!(await Leia.exists({ 'spec.behaviourId': behaviourId }));
  }

  async findByBehaviourId(behaviourId) {
    return await Leia.find({ 'spec.behaviourId': behaviourId });
  }

  async findByRubricId(rubricId) {
    return await Leia.find({ 'spec.rubricId': rubricId });
  }

  async findByName(name, userId, visibility = 'all', privileged = false) {
    const query = { 'metadata.name': name };

    if (!applyVisibilityFilters(query, userId, visibility, privileged)) {
      return []; // User requested private resources but has no userId
    }

    return await Leia.find(query);
  }

  async findLatestVersionByName(name) {
    return await Leia.findOne({ 'metadata.name': name }).sort({
      'metadata.version.major': -1,
      'metadata.version.minor': -1,
      'metadata.version.patch': -1,
    });
  }

  findFirstVersionByName(name) {
    return Leia.findOne({
      'metadata.name': name,
      'metadata.version.major': 1,
      'metadata.version.minor': 0,
      'metadata.version.patch': 0,
    });
  }

  async findByNameAndVersion(name, version) {
    return await Leia.findOne({ 'metadata.name': name, 'metadata.version': version });
  }

  async findByQuery(text, version, apiVersion, userId = null, visibility = 'all', privileged = false, labelId) {
    const query = {};

    // Apply visibility filters
    if (!applyVisibilityFilters(query, userId, visibility, privileged)) {
      return []; // User requested private resources but has no userId
    }

    // Add text and apiVersion filters to query
    if (text) {
      Object.assign(query, regexQuery(text, 'metadata.name'));
    }
    if (apiVersion) {
      query['apiVersion'] = apiVersion;
    }
    if (labelId) {
      const labelObjectId = new mongoose.Types.ObjectId(labelId);
      query['$or'] = [
        { 'metadata.labels': labelObjectId },
        { 'metadata.label': labelObjectId },
      ];
    }
    if (version === 'latest') {
      // Pass the complete query to the aggregation
      return await Leia.aggregate(aggregateFindLatestVersions(query));
    } else if (version) {
      query['metadata.version'] = version;
    }

    return await Leia.find(query).populate('metadata.labels');
  }

  // WRITE METHODS

  async create(leiaData) {
    const leia = new Leia(leiaData);
    return await leia.save();
  }

  // Delete Leia by ID
  async deleteById(id) {
    return await Leia.findByIdAndDelete(id);
  }

  // Replace all occurrences of sourceLabelId with targetLabelId in Leias
  async replaceLabels(sourceLabelId, targetLabelId) {
    const sourceLabelObjectId = new mongoose.Types.ObjectId(sourceLabelId);
    const targetLabelObjectId = new mongoose.Types.ObjectId(targetLabelId);

    await Leia.updateMany(
      { 'metadata.labels': sourceLabelObjectId },
      { $addToSet: { 'metadata.labels': targetLabelObjectId } }
    );
    await Leia.updateMany(
      { 'metadata.label': targetLabelObjectId },
      { $pull: { 'metadata.labels': sourceLabelObjectId } }
    );
  }
}

export default new LeiaRepository();
