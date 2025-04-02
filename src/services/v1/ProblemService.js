import ProblemRepository from '../../repositories/v1/ProblemRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';

class ProblemService {
  // READ METHODS

  async findAll() {
    return await ProblemRepository.findAll();
  }

  async findById(id) {
    return await ProblemRepository.findById(id);
  }

  async existsByName(name) {
    return await ProblemRepository.existsByName(name);
  }

  async findByName(name) {
    return await ProblemRepository.findByName(name);
  }

  async findLatestVersionByName(name) {
    return await ProblemRepository.findLatestVersionByName(name);
  }

  async findFirstVersionByName(name) {
    return await ProblemRepository.findFirstVersionByName(name);
  }

  async findByNameAndVersion(name, version) {
    if (version === 'latest') {
      return await ProblemRepository.findLatestVersionByName(name);
    } else {
      version = getVersionObjectFromString(version);
      return await ProblemRepository.findByNameAndVersion(name, version);
    }
  }

  async findByQuery(text, version, apiVersion) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }
    return await ProblemRepository.findByQuery(text, version, apiVersion);
  }

  // WRITE METHODS

  async create(problemData) {
    delete problemData.metadata.version; // Remove to set the version to 1.0.0
    return await ProblemRepository.create(problemData);
  }

  async createNewVersion(problemData) {
    const latestVersion = await ProblemRepository.findLatestVersionByName(problemData.metadata.name);

    if (!latestVersion) {
      const error = new Error('Problem not found, please create a new problem instead');
      error.statusCode = 404;
      throw error;
    }

    problemData.metadata.version = getVersionObjectFromString(problemData.metadata.version);

    if (!isObjectVersionGreater(problemData.metadata.version, latestVersion.metadata.version)) {
      const error = new Error(
        'Version must be greater than the latest version: ' +
          `${latestVersion.metadata.version.major}.${latestVersion.metadata.version.minor}.${latestVersion.metadata.version.patch}`
      );
      error.statusCode = 400;
      throw error;
    }

    return await ProblemRepository.create(problemData);
  }
}

export default new ProblemService();
