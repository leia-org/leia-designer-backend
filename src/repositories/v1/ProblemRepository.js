import Problem from '../../models/Problem.js';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';
import { applyVisibilityFilters } from '../../utils/entity.js';

class ProblemRepository {
  // READ METHODS

  async findAll() {
    return await Problem.find();
  }

  async find(filter) {
    return await Problem.find(filter);
  }

  async findById(id) {
    return await Problem.findById(id);
  }

  async findByIdPopulatedUser(id) {
    return await Problem.findById(id).populate('user');
  }

  async existsByName(name) {
    return !!(await Problem.exists({ 'metadata.name': name }));
  }

  async findByName(name, userId, visibility = 'all', privileged = false) {
    const query = { 'metadata.name': name };

    if (!applyVisibilityFilters(query, userId, visibility, privileged)) {
      return []; // User requested private resources but has no userId
    }

    return await Problem.find(query);
  }

  async findLatestVersionByName(name) {
    return await Problem.findOne({ 'metadata.name': name }).sort({
      'metadata.version.major': -1,
      'metadata.version.minor': -1,
      'metadata.version.patch': -1,
    });
  }

  findFirstVersionByName(name) {
    return Problem.findOne({
      'metadata.name': name,
      'metadata.version.major': 1,
      'metadata.version.minor': 0,
      'metadata.version.patch': 0,
    });
  }

  async findByNameAndVersion(name, version) {
    return await Problem.findOne({ 'metadata.name': name, 'metadata.version': version });
  }

  async findByQuery(text, version, apiVersion, process, userId = null, visibility = 'all', privileged = false) {
    const query = {};

    // Apply visibility filters
    if (!applyVisibilityFilters(query, userId, visibility, privileged)) {
      return []; // User requested private resources but has no userId
    }

    // Add text and apiVersion filters to query
    if (text) {
      query['$text'] = { $search: text };
    }
    if (apiVersion) {
      query['apiVersion'] = apiVersion;
    }
    if (process && process !== 'all') {
      query['spec.process'] = process;
    }

    if (version === 'latest') {
      // Pass the complete query to the aggregation
      return await Problem.aggregate(aggregateFindLatestVersions(query));
    } else if (version) {
      query['metadata.version'] = version;
    }

    return await Problem.find(query).populate('user');
  }

  // WRITE METHODS

  async create(problemData) {
    const problem = new Problem(problemData);
    return await problem.save();
  }

  // DELETE METHODS

  async deleteById(id) {
    return await Problem.findByIdAndDelete(id);
  }
}

export default new ProblemRepository();
