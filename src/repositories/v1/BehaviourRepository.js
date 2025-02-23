import Behaviour from '../../models/Behaviour.js';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';

class BehaviourRepository {
  // READ METHODS

  async findAll() {
    return await Behaviour.find();
  }

  async findById(id) {
    return await Behaviour.findById(id);
  }

  async existsByName(name) {
    return !!(await Behaviour.exists({ 'metadata.name': name }));
  }

  async findByName(name) {
    return await Behaviour.find({ 'metadata.name': name });
  }

  async findLatestVersionByName(name) {
    return await Behaviour.findOne({ 'metadata.name': name }).sort({
      'metadata.version.major': -1,
      'metadata.version.minor': -1,
      'metadata.version.patch': -1,
    });
  }

  async findByNameAndVersion(name, version) {
    return await Behaviour.findOne({ 'metadata.name': name, 'metadata.version': version });
  }

  async findByQuery(text, version, apiVersion) {
    const query = {};

    if (version === 'latest') {
      return await Behaviour.aggregate(aggregateFindLatestVersions(text));
    } else if (version) {
      query['metadata.version'] = version;
    }
    if (text) {
      query['$text'] = { $search: text };
    }
    if (apiVersion) {
      query['apiVersion'] = apiVersion;
    }

    return await Behaviour.find(query);
  }

  // WRITE METHODS

  async create(behaviourData) {
    const behaviour = new Behaviour(behaviourData);
    return await behaviour.save();
  }
}

export default new BehaviourRepository();
