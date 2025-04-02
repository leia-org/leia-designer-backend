import Problem from '../../models/Problem.js';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';

class ProblemRepository {
  // READ METHODS

  async findAll() {
    return await Problem.find();
  }

  async findById(id) {
    return await Problem.findById(id);
  }

  async existsByName(name) {
    return !!(await Problem.exists({ 'metadata.name': name }));
  }

  async findByName(name) {
    return await Problem.find({ 'metadata.name': name });
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

  async findByQuery(text, version, apiVersion) {
    const query = {};

    if (version === 'latest') {
      return await Problem.aggregate(aggregateFindLatestVersions(text));
    } else if (version) {
      query['metadata.version'] = version;
    }
    if (text) {
      query['$text'] = { $search: text };
    }
    if (apiVersion) {
      query['apiVersion'] = apiVersion;
    }

    return await Problem.find(query);
  }

  // WRITE METHODS

  async create(problemData) {
    const problem = new Problem(problemData);
    return await problem.save();
  }
}

export default new ProblemRepository();
