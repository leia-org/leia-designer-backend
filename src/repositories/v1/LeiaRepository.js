import Leia from '../../models/Leia.js';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';
import { applyVisibilityFilters } from '../../utils/entity.js';

class LeiaRepository {
  // READ METHODS

  async findAll() {
    return await Leia.find();
  }

  async findById(id) {
    return await Leia.findById(id);
  }

  async existsByName(name) {
    return !!(await Leia.exists({ 'metadata.name': name }));
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

  async findByQuery(text, version, apiVersion, userId = null, visibility = 'all', privileged = false) {
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

    if (version === 'latest') {
      // Pass the complete query to the aggregation
      return await Leia.aggregate(aggregateFindLatestVersions(query));
    } else if (version) {
      query['metadata.version'] = version;
    }

    return await Leia.find(query).populate('user');
  }

  // WRITE METHODS

  async create(leiaData) {
    const leia = new Leia(leiaData);
    return await leia.save();
  }
}

export default new LeiaRepository();
