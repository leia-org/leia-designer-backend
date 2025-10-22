import ProblemRepository from '../../repositories/v1/ProblemRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';
import { canAccess, createUnauthorizedError } from '../../utils/entity.js';

class ProblemService {
  // READ METHODS

  async findAll() {
    return await ProblemRepository.findAll();
  }

  /**
   * Find problem by ID with access control
   * @param {string} id - Problem ID
   * @param {Context} context - User context
   * @returns {Promise<Object>} Problem document
   * @throws {Error} If not found or access denied
   */
  async findById(id, context = {}) {
    const problem = await ProblemRepository.findById(id);

    if (!canAccess(problem, context)) {
      throw createUnauthorizedError('Problem');
    }

    return problem;
  }

  async findByIdPopulatedUser(id, context = {}) {
    const problem = await ProblemRepository.findByIdPopulatedUser(id);

    if (!canAccess(problem, context)) {
      throw createUnauthorizedError('Problem');
    }

    return problem;
  }

  async existsByName(name) {
    return await ProblemRepository.existsByName(name);
  }

  async findByName(name, visibility = 'all', context = {}) {
    return await ProblemRepository.findByName(name, context.userId, visibility, context.role === 'admin' || context.internal);
  }

  /**
   * Find latest version of problem by name with access control
   * @param {string} name - Problem name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Problem document
   * @throws {Error} If not found or access denied
   */
  async findLatestVersionByName(name, context = {}) {
    const problem = await ProblemRepository.findLatestVersionByName(name);

    if (!canAccess(problem, context)) {
      throw createUnauthorizedError('Problem');
    }

    return problem;
  }

  /**
   * Find first version of problem by name with access control
   * @param {string} name - Problem name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Problem document
   * @throws {Error} If not found or access denied
   */
  async findFirstVersionByName(name, context = {}) {
    const problem = await ProblemRepository.findFirstVersionByName(name);

    if (!canAccess(problem, context)) {
      throw createUnauthorizedError('Problem');
    }

    return problem;
  }

  /**
   * Find problem by name and version with access control
   * @param {string} name - Problem name
   * @param {string} version - Version string (e.g., '1.0.0' or 'latest')
   * @param {Context} context - User context
   * @returns {Promise<Object>} Problem document
   * @throws {Error} If not found or access denied
   */
  async findByNameAndVersion(name, version, context = {}) {
    let problem;

    if (version === 'latest') {
      problem = await ProblemRepository.findLatestVersionByName(name);
    } else {
      const versionObj = getVersionObjectFromString(version);
      problem = await ProblemRepository.findByNameAndVersion(name, versionObj);
    }

    if (!canAccess(problem, context)) {
      throw createUnauthorizedError('Problem');
    }

    return problem;
  }

  async findByQuery(text, version, apiVersion, process, visibility = 'all', context = {}) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }

    return await ProblemRepository.findByQuery(text, version, apiVersion, process, context.userId, visibility, context.role === 'admin' || context.internal);
  }

  // WRITE METHODS

  async create(problemData, context = {}, publish = true) {
    delete problemData.metadata.version; // Remove to set the version to 1.0.0
    if (context.role === 'admin') {
      problemData.isPublished = publish; // Admin can decide to publish or not when creating a new resource
    }
    return await ProblemRepository.create(problemData);
  }

  async createNewVersion(problemData, context = {}, publish = true) {
    // Check if problem with this name exists
    // In case in the future we allow collaboration I would suggest using the first version resource as the one which contains the configuration of who can collaborate
    // Ideally we would have a parent collection for all entities which would contain this information
    // As of now, only the owner can create new versions

    const latestVersion = await ProblemRepository.findLatestVersionByName(problemData.metadata.name);
    if (!latestVersion) {
      const error = new Error('Problem not found, please create a new problem instead');
      error.statusCode = 404;
      throw error;
    }

    // Check if user owns the problem (only owner can create new versions)
    if (!latestVersion.user || !latestVersion.user.equals(context.userId)) {
      const error = new Error(
        "Unauthorized, a problem with this name already exists and you don't have permission to version it"
      );
      error.statusCode = 403;
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

    if (context.role === 'admin') {
      problemData.isPublished = publish; // Admin can decide to publish or not when creating a new version of resource
    }

    return await ProblemRepository.create(problemData);
  }

  async publish(id, context = {}) {
    const problem = await ProblemRepository.findById(id);

    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }

    // Only admin can publish
    if (context.role !== 'admin' && !context.internal) {
      const error = new Error('Unauthorized, only admin can publish a problem');
      error.statusCode = 403;
      throw error;
    }

    if (problem.isPublished) {
      return problem; // If already published, do nothing
    }

    problem.isPublished = true;
    return await problem.save();
  }

  async unpublish(id, context = {}) {
    const problem = await ProblemRepository.findById(id);

    if (!problem) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }

    // Only admin can unpublish
    if (context.role !== 'admin' && !context.internal) {
      const error = new Error('Unauthorized, only admin can unpublish a problem');
      error.statusCode = 403;
      throw error;
    }

    if (!problem.isPublished) {
      return problem; // If already unpublished, do nothing
    }

    problem.isPublished = false;
    return await problem.save();
  }
}

export default new ProblemService();