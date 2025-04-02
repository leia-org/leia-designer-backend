import Persona from '../../models/Persona.js';
import { aggregateFindLatestVersions } from '../../utils/aggregates.js';

class PersonaRepository {
  // READ METHODS

  async findAll() {
    return await Persona.find();
  }

  async findById(id) {
    return await Persona.findById(id);
  }

  async existsByName(name) {
    return !!(await Persona.exists({ 'metadata.name': name }));
  }

  async findByName(name) {
    return await Persona.find({ 'metadata.name': name });
  }

  async findLatestVersionByName(name) {
    return await Persona.findOne({ 'metadata.name': name }).sort({
      'metadata.version.major': -1,
      'metadata.version.minor': -1,
      'metadata.version.patch': -1,
    });
  }

  findFirstVersionByName(name) {
    return Persona.findOne({
      'metadata.name': name,
      'metadata.version.major': 1,
      'metadata.version.minor': 0,
      'metadata.version.patch': 0,
    });
  }

  async findByNameAndVersion(name, version) {
    return await Persona.findOne({ 'metadata.name': name, 'metadata.version': version });
  }

  async findByQuery(text, version, apiVersion) {
    const query = {};

    if (version === 'latest') {
      return await Persona.aggregate(aggregateFindLatestVersions(text));
    } else if (version) {
      query['metadata.version'] = version;
    }
    if (text) {
      query['$text'] = { $search: text };
    }
    if (apiVersion) {
      query['apiVersion'] = apiVersion;
    }

    return await Persona.find(query);
  }

  // WRITE METHODS

  async create(personaData) {
    const persona = new Persona(personaData);
    return await persona.save();
  }
}

export default new PersonaRepository();
