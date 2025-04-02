import PersonaRepository from '../../repositories/v1/PersonaRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';

class PersonaService {
  // READ METHODS

  async findAll() {
    return await PersonaRepository.findAll();
  }

  async findById(id) {
    return await PersonaRepository.findById(id);
  }

  async existsByName(name) {
    return await PersonaRepository.existsByName(name);
  }

  async findByName(name) {
    return await PersonaRepository.findByName(name);
  }

  async findLatestVersionByName(name) {
    return await PersonaRepository.findLatestVersionByName(name);
  }

  async findFirstVersionByName(name) {
    return await PersonaRepository.findFirstVersionByName(name);
  }

  async findByNameAndVersion(name, version) {
    if (version === 'latest') {
      return await PersonaRepository.findLatestVersionByName(name);
    } else {
      version = getVersionObjectFromString(version);
      return await PersonaRepository.findByNameAndVersion(name, version);
    }
  }

  async findByQuery(text, version, apiVersion) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }
    return await PersonaRepository.findByQuery(text, version, apiVersion);
  }

  // WRITE METHODS

  async create(personaData) {
    delete personaData.metadata.version; // Remove to set the version to 1.0.0
    return await PersonaRepository.create(personaData);
  }

  async createNewVersion(personaData) {
    const latestVersion = await PersonaRepository.findLatestVersionByName(personaData.metadata.name);

    if (!latestVersion) {
      const error = new Error('Persona not found, please create a new persona instead');
      error.statusCode = 404;
      throw error;
    }

    personaData.metadata.version = getVersionObjectFromString(personaData.metadata.version);

    if (!isObjectVersionGreater(personaData.metadata.version, latestVersion.metadata.version)) {
      const error = new Error(
        'Version must be greater than the latest version: ' +
          `${latestVersion.metadata.version.major}.${latestVersion.metadata.version.minor}.${latestVersion.metadata.version.patch}`
      );
      error.statusCode = 400;
      throw error;
    }

    return await PersonaRepository.create(personaData);
  }
}

export default new PersonaService();
