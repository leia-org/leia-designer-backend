import PersonaRepository from '../repositories/PersonaRepository.js';
import { incrementVersion } from '../utils/versioning.js';

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

  async findByNameAndVersion(name, version) {
    return await PersonaRepository.findByNameAndVersion(name, version);
  }

  // WRITE METHODS

  async create(personaData) {
    return await PersonaRepository.create(personaData);
  }

  async createNewVersion(personaData, versionType) {
    const latestVersion = await PersonaRepository.findLatestVersionByName(personaData.name);

    if (!latestVersion) {
      return await PersonaRepository.create(personaData);
    }

    const newVersion = incrementVersion(latestVersion.version, versionType);

    personaData.version = newVersion;

    return await PersonaRepository.create(personaData);
  }
}

export default new PersonaService();
