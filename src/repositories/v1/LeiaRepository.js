import Leia from '../../models/Leia.js';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';

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

  async findByName(name) {
    return await Leia.find({ 'metadata.name': name });
  }

  async findLatestVersionByName(name) {
    return await Leia.findOne({ 'metadata.name': name }).sort({
      'metadata.version.major': -1,
      'metadata.version.minor': -1,
      'metadata.version.patch': -1,
    });
  }

  async findByNameAndVersion(name, version) {
    return await Leia.findOne({ 'metadata.name': name, 'metadata.version': version });
  }

  async findByQuery(text, version, apiVersion) {
    const query = {};

    if (version === 'latest') {
      return await Leia.aggregate(aggregateFindLatestVersions(text));
    } else if (version) {
      query['metadata.version'] = version;
    }
    if (text) {
      query['$text'] = { $search: text };
    }
    if (apiVersion) {
      query['apiVersion'] = apiVersion;
    }

    return await Leia.find(query);
  }

  // WRITE METHODS

  async create(leiaData) {
    const leia = new Leia(leiaData);
    return await leia.save();
  }
}

export default new LeiaRepository();
