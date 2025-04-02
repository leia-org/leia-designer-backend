import BehaviourRepository from '../../repositories/v1/BehaviourRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';

class BehaviourService {
  // READ METHODS

  async findAll() {
    return await BehaviourRepository.findAll();
  }

  async findById(id) {
    return await BehaviourRepository.findById(id);
  }

  async existsByName(name) {
    return await BehaviourRepository.existsByName(name);
  }

  async findByName(name) {
    return await BehaviourRepository.findByName(name);
  }

  async findLatestVersionByName(name) {
    return await BehaviourRepository.findLatestVersionByName(name);
  }

  async findFirstVersionByName(name) {
    return await BehaviourRepository.findFirstVersionByName(name);
  }

  async findByNameAndVersion(name, version) {
    if (version === 'latest') {
      return await BehaviourRepository.findLatestVersionByName(name);
    } else {
      version = getVersionObjectFromString(version);
      return await BehaviourRepository.findByNameAndVersion(name, version);
    }
  }

  async findByQuery(text, version, apiVersion) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }
    return await BehaviourRepository.findByQuery(text, version, apiVersion);
  }

  // WRITE METHODS

  async create(behaviourData) {
    delete behaviourData.metadata.version; // Remove to set the version to 1.0.0
    return await BehaviourRepository.create(behaviourData);
  }

  async createNewVersion(behaviourData) {
    const latestVersion = await BehaviourRepository.findLatestVersionByName(behaviourData.metadata.name);

    if (!latestVersion) {
      const error = new Error('Behaviour not found, please create a new behaviour instead');
      error.statusCode = 404;
      throw error;
    }

    behaviourData.metadata.version = getVersionObjectFromString(behaviourData.metadata.version);

    if (!isObjectVersionGreater(behaviourData.metadata.version, latestVersion.metadata.version)) {
      const error = new Error(
        'Version must be greater than the latest version: ' +
          `${latestVersion.metadata.version.major}.${latestVersion.metadata.version.minor}.${latestVersion.metadata.version.patch}`
      );
      error.statusCode = 400;
      throw error;
    }

    return await BehaviourRepository.create(behaviourData);
  }
}

export default new BehaviourService();
