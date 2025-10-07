import BehaviourRepository from '../../repositories/v1/BehaviourRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';
import { canAccess, createUnauthorizedError } from '../../utils/entity.js';
import LeiaService from './LeiaService.js';

class BehaviourService {
  // READ METHODS

  async findAll() {
    return await BehaviourRepository.findAll();
  }

  /**
   * Find behaviour by ID with access control
   * @param {string} id - Behaviour ID
   * @param {Context} context - User context
   * @returns {Promise<Object>} Behaviour document
   * @throws {Error} If not found or access denied
   */
  async findById(id, context = {}) {
    const behaviour = await BehaviourRepository.findById(id);

    if (!canAccess(behaviour, context)) {
      throw createUnauthorizedError('Behaviour');
    }

    return behaviour;
  }

  async findByIdPopulatedUser(id, context = {}) {
    const behaviour = await BehaviourRepository.findByIdPopulatedUser(id);

    if (!canAccess(behaviour, context)) {
      throw createUnauthorizedError('Behaviour');
    }

    return behaviour;
  }

  async existsByName(name) {
    return await BehaviourRepository.existsByName(name);
  }

  async findByName(name, visibility = 'all', context = {}) {
    return await BehaviourRepository.findByName(name, context.userId, visibility, context.role === 'admin' || context.internal);
  }

  /**
   * Find latest version of behaviour by name with access control
   * @param {string} name - Behaviour name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Behaviour document
   * @throws {Error} If not found or access denied
   */
  async findLatestVersionByName(name, context = {}) {
    const behaviour = await BehaviourRepository.findLatestVersionByName(name);

    if (!canAccess(behaviour, context)) {
      throw createUnauthorizedError('Behaviour');
    }

    return behaviour;
  }

  /**
   * Find first version of behaviour by name with access control
   * @param {string} name - Behaviour name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Behaviour document
   * @throws {Error} If not found or access denied
   */
  async findFirstVersionByName(name, context = {}) {
    const behaviour = await BehaviourRepository.findFirstVersionByName(name);

    if (!canAccess(behaviour, context)) {
      throw createUnauthorizedError('Behaviour');
    }

    return behaviour;
  }

  /**
   * Find behaviour by name and version with access control
   * @param {string} name - Behaviour name
   * @param {string} version - Version string (e.g., '1.0.0' or 'latest')
   * @param {Context} context - User context
   * @returns {Promise<Object>} Behaviour document
   * @throws {Error} If not found or access denied
   */
  async findByNameAndVersion(name, version, context = {}) {
    let behaviour;

    if (version === 'latest') {
      behaviour = await BehaviourRepository.findLatestVersionByName(name);
    } else {
      const versionObj = getVersionObjectFromString(version);
      behaviour = await BehaviourRepository.findByNameAndVersion(name, versionObj);
    }

    if (!canAccess(behaviour, context)) {
      throw createUnauthorizedError('Behaviour');
    }

    return behaviour;
  }

  async findByQuery(text, version, apiVersion, process, visibility = 'all', context = {}) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }

    return await BehaviourRepository.findByQuery(
      text,
      version,
      apiVersion,
      process,
      context.userId,
      visibility,
      context.role === 'admin' || context.internal
    );
  }

  // WRITE METHODS

  async create(behaviourData, context = {}, publish = true) {
    delete behaviourData.metadata.version; // Remove to set the version to 1.0.0
    if (context.role === 'admin') {
      behaviourData.isPublished = publish; // Admin can decide to publish or not when creating a new resource
    }
    return await BehaviourRepository.create(behaviourData);
  }

  async createNewVersion(behaviourData, context = {}, publish = true) {
    // Check if behaviour with this name exists
    // In case in the future we allow collaboration I would suggest using the first version resource as the one which contains the configuration of who can collaborate
    // Ideally we would have a parent collection for all entities which would contain this information
    // As of now, only the owner can create new versions

    const latestVersion = await BehaviourRepository.findLatestVersionByName(behaviourData.metadata.name);
    if (!latestVersion) {
      const error = new Error('Behaviour not found, please create a new behaviour instead');
      error.statusCode = 404;
      throw error;
    }

    // Check if user owns the behaviour (only owner can create new versions)
    if (!latestVersion.user || !latestVersion.user.equals(context.userId)) {
      const error = new Error(
        "Unauthorized, a behaviour with this name already exists and you don't have permission to version it"
      );
      error.statusCode = 403;
      throw error;
    }

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

    if (context.role === 'admin') {
      behaviourData.isPublished = publish; // Admin can decide to publish or not when creating a new version of resource
    }

    return await BehaviourRepository.create(behaviourData);
  }

  // DELETE METHODS

  async deleteById(id, context = {}) {
    const behaviour = await BehaviourRepository.findById(id);

    if (!behaviour) {
      const error = new Error('Behaviour not found');
      error.statusCode = 404;
      throw error;
    }

    if (context.role !== 'admin' && !context.internal && (!behaviour.user || !behaviour.user.equals(context.userId))) {
      const error = new Error("Unauthorized");
      error.statusCode = 403;
      throw error;
    }

    const isInUse = await LeiaService.existsByBehaviourId(id);
    if (isInUse) {
      const error = new Error('Cannot delete behaviour, it is used in one or more leias');
      error.statusCode = 400;
      throw error;
    }

    return await BehaviourRepository.deleteById(id);
  }
}

export default new BehaviourService();
