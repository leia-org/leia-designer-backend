import PersonaRepository from '../../repositories/v1/PersonaRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';
import { canAccess, createUnauthorizedError } from '../../utils/entity.js';
import LeiaService from './LeiaService.js';

class PersonaService {
  // READ METHODS

  async findAll() {
    return await PersonaRepository.findAll();
  }

  /**
   * Find persona by ID with access control
   * @param {string} id - Persona ID
   * @param {Context} context - User context
   * @returns {Promise<Object>} Persona document
   * @throws {Error} If not found or access denied
   */
  async findById(id, context = {}) {
    const persona = await PersonaRepository.findById(id);

    if (!canAccess(persona, context)) {
      throw createUnauthorizedError('Persona');
    }

    return persona;
  }

  async findByIdPopulatedUser(id, context = {}) {
    const persona = await PersonaRepository.findByIdPopulatedUser(id);

    if (!canAccess(persona, context)) {
      throw createUnauthorizedError('Persona');
    }

    return persona;
  }

  async existsByName(name) {
    return await PersonaRepository.existsByName(name);
  }

  async findByName(name, visibility = 'all', context = {}) {
    return await PersonaRepository.findByName(name, context.userId, visibility, context.role === 'admin' || context.internal);
  }

  /**
   * Find latest version of persona by name with access control
   * @param {string} name - Persona name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Persona document
   * @throws {Error} If not found or access denied
   */
  async findLatestVersionByName(name, context = {}) {
    const persona = await PersonaRepository.findLatestVersionByName(name);

    if (!canAccess(persona, context)) {
      throw createUnauthorizedError('Persona');
    }

    return persona;
  }

  /**
   * Find first version of persona by name with access control
   * @param {string} name - Persona name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Persona document
   * @throws {Error} If not found or access denied
   */
  async findFirstVersionByName(name, context = {}) {
    const persona = await PersonaRepository.findFirstVersionByName(name);

    if (!canAccess(persona, context)) {
      throw createUnauthorizedError('Persona');
    }

    return persona;
  }

  /**
   * Find persona by name and version with access control
   * @param {string} name - Persona name
   * @param {string} version - Version string (e.g., '1.0.0' or 'latest')
   * @param {Context} context - User context
   * @returns {Promise<Object>} Persona document
   * @throws {Error} If not found or access denied
   */
  async findByNameAndVersion(name, version, context = {}) {
    let persona;

    if (version === 'latest') {
      persona = await PersonaRepository.findLatestVersionByName(name);
    } else {
      const versionObj = getVersionObjectFromString(version);
      persona = await PersonaRepository.findByNameAndVersion(name, versionObj);
    }

    if (!canAccess(persona, context)) {
      throw createUnauthorizedError('Persona');
    }

    return persona;
  }

  async findByQuery(text, version, apiVersion, visibility = 'all', context = {}) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }

    return await PersonaRepository.findByQuery(text, version, apiVersion, context.userId, visibility, context.role === 'admin' || context.internal);
  }

  // WRITE METHODS

  async create(personaData, context = {}, publish = true) {
    delete personaData.metadata.version; // Remove to set the version to 1.0.0
    if (context.role === 'admin') {
      personaData.isPublished = publish; // Admin can decide to publish or not when creating a new resource
    }
    return await PersonaRepository.create(personaData);
  }

  async createNewVersion(personaData, context = {}, publish = true) {
    // Check if persona with this name exists
    // In case in the future we allow collaboration I would suggest using the first version resource as the one which contains the configuration of who can collaborate
    // Ideally we would have a parent collection for all entities which would contain this information
    // As of now, only the owner can create new versions

    const latestVersion = await PersonaRepository.findLatestVersionByName(personaData.metadata.name);
    if (!latestVersion) {
      const error = new Error('Persona not found, please create a new persona instead');
      error.statusCode = 404;
      throw error;
    }

    // Check if user owns the persona (only owner can create new versions)
    if (!latestVersion.user || !latestVersion.user.equals(context.userId)) {
      const error = new Error(
        "Unauthorized, a persona with this name already exists and you don't have permission to version it"
      );
      error.statusCode = 403;
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

    if (context.role === 'admin') {
      personaData.isPublished = publish; // Admin can decide to publish or not when creating a new version of resource
    }

    return await PersonaRepository.create(personaData);
  }

  // DELETE METHODS

  async deleteById(id, context = {}) {
    const persona = await PersonaRepository.findById(id);

    if (!persona) {
      const error = new Error('Persona not found');
      error.statusCode = 404;
      throw error;
    }

    if (context.role !== 'admin' && !context.internal && (!persona.user || !persona.user.equals(context.userId))) {
      const error = new Error("Unauthorized");
      error.statusCode = 403;
      throw error;
    }

    const inUse = await LeiaService.findByPersonaId(id);
    if (inUse && inUse.length > 0) {
      const error = new Error("Cannot delete persona in use");
      error.statusCode = 400;
      error.data = inUse.map((leia) => ({ id: leia._id, name: leia.metadata.name }));
      throw error;
    }

    return await PersonaRepository.deleteById(id);
  }
}

export default new PersonaService();
