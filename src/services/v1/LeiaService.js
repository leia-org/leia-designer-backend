import LeiaRepository from '../../repositories/v1/LeiaRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';
import PersonaService from './PersonaService.js';
import BehaviourService from './BehaviourService.js';
import ProblemService from './ProblemService.js';
import ExperimentService from './ExperimentService.js';
import { findEntity, canAccess, createUnauthorizedError } from '../../utils/entity.js';
import { checkConstraints, resolveExtensions, resolveOverrides, resolvePlaceholders } from '../../utils/leia.js';

class LeiaService {
  // READ METHODS

  async findAll() {
    return await LeiaRepository.findAll();
  }

  /**
   * Find leia by ID with access control
   * @param {string} id - Leia ID
   * @param {Context} context - User context
   * @returns {Promise<Object>} Leia document
   * @throws {Error} If not found or access denied
   */
  async findById(id, context = {}) {
    const leia = await LeiaRepository.findById(id);

    if (!canAccess(leia, context)) {
      throw createUnauthorizedError('Leia');
    }

    return leia;
  }

  async findByIdPopulatedUser(id, context = {}) {
    const leia = await LeiaRepository.findByIdPopulatedUser(id);

    if (!canAccess(leia, context)) {
      throw createUnauthorizedError('Leia');
    }

    return leia;
  }

  async existsByName(name) {
    return await LeiaRepository.existsByName(name);
  }

  async existsByPersonaId(personaId) {
    return await LeiaRepository.existsByPersonaId(personaId);
  }

  async findByPersonaId(personaId) {
    return await LeiaRepository.findByPersonaId(personaId);
  }

  async existsByProblemId(problemId) {
    return await LeiaRepository.existsByProblemId(problemId);
  }

  async findByProblemId(problemId) {
    return await LeiaRepository.findByProblemId(problemId);
  }

  async existsByBehaviourId(behaviourId) {
    return await LeiaRepository.existsByBehaviourId(behaviourId);
  }

  async findByBehaviourId(behaviourId) {
    return await LeiaRepository.findByBehaviourId(behaviourId);
  }

  async findByName(name, visibility = 'all', context = {}) {
    return await LeiaRepository.findByName(name, context.userId, visibility, context.role === 'admin' || context.internal);
  }

  /**
   * Find latest version of leia by name with access control
   * @param {string} name - Leia name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Leia document
   * @throws {Error} If not found or access denied
   */
  async findLatestVersionByName(name, context = {}) {
    const leia = await LeiaRepository.findLatestVersionByName(name);

    if (!canAccess(leia, context)) {
      throw createUnauthorizedError('Leia');
    }

    return leia;
  }

  /**
   * Find first version of leia by name with access control
   * @param {string} name - Leia name
   * @param {Context} context - User context
   * @returns {Promise<Object>} Leia document
   * @throws {Error} If not found or access denied
   */
  async findFirstVersionByName(name, context = {}) {
    const leia = await LeiaRepository.findFirstVersionByName(name);

    if (!canAccess(leia, context)) {
      throw createUnauthorizedError('Leia');
    }

    return leia;
  }

  /**
   * Find leia by name and version with access control
   * @param {string} name - Leia name
   * @param {string} version - Version string (e.g., '1.0.0' or 'latest')
   * @param {Context} context - User context
   * @returns {Promise<Object>} Leia document
   * @throws {Error} If not found or access denied
   */
  async findByNameAndVersion(name, version, context = {}) {
    let leia;

    if (version === 'latest') {
      leia = await LeiaRepository.findLatestVersionByName(name);
    } else {
      const versionObj = getVersionObjectFromString(version);
      leia = await LeiaRepository.findByNameAndVersion(name, versionObj);
    }

    if (!canAccess(leia, context)) {
      throw createUnauthorizedError('Leia');
    }

    return leia;
  }

  async findByQuery(text, version, apiVersion, visibility = 'all', context = {}) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }

    return await LeiaRepository.findByQuery(
      text,
      version,
      apiVersion,
      context.userId,
      visibility,
      context.role === 'admin' || context.internal
    );
  }

  // WRITE METHODS

  async create(leiaData, context = {}, publish = true) {
    delete leiaData.metadata.version; // Remove to set the version to 1.0.0

    // Find the entities, save the IDs and convert them to JSON to simplify the object (less computing/problems in object recursion)
    const persona = await findEntity(leiaData.spec.persona, PersonaService, 'Persona not found').then((persona) => {
      leiaData.spec.personaId = persona._id;
      return persona.toJSON();
    });
    const behaviour = await findEntity(leiaData.spec.behaviour, BehaviourService, 'Behaviour not found').then(
      (behaviour) => {
        leiaData.spec.behaviourId = behaviour._id;
        return behaviour.toJSON();
      }
    );
    const problem = await findEntity(leiaData.spec.problem, ProblemService, 'Problem not found').then((problem) => {
      leiaData.spec.problemId = problem._id;
      return problem.toJSON();
    });

    const entities = { persona, behaviour, problem };

    checkConstraints(entities);
    const extendedEntities = resolveExtensions(entities);
    const overriddenEntities = resolveOverrides(extendedEntities);
    const replacedEntities = resolvePlaceholders(overriddenEntities);

    leiaData.spec.persona = replacedEntities.persona;
    leiaData.spec.behaviour = replacedEntities.behaviour;
    leiaData.spec.problem = replacedEntities.problem;

    delete leiaData.metadata.version; // Remove to set the version to 1.0.0

    if ((context.role === 'admin' || context.internal) && publish) {
      leiaData.isPublished = true;
      if (!persona.isPublished) {
        await PersonaService.publish(persona.id, context); // Admin can publish unpublished entities when creating a leia
        leiaData.spec.persona.isPublished = true;
      }
      if (!behaviour.isPublished) {
        await BehaviourService.publish(behaviour.id, context);
        leiaData.spec.behaviour.isPublished = true;
      }
      if (!problem.isPublished) {
        await ProblemService.publish(problem.id, context);
        leiaData.spec.problem.isPublished = true;
      }
    }

    return await LeiaRepository.create(leiaData);
  }

  async createNewVersion(leiaData, context = {}, publish = true) {
    // Check if leia with this name exists
    // In case in the future we allow collaboration I would suggest using the first version resource as the one which contains the configuration of who can collaborate
    // Ideally we would have a parent collection for all entities which would contain this information
    // As of now, only the owner can create new versions

    const latestVersion = await LeiaRepository.findLatestVersionByName(leiaData.metadata.name);
    if (!latestVersion) {
      const error = new Error('Leia not found, please create a new leia instead');
      error.statusCode = 404;
      throw error;
    }

    // Check if user owns the leia (only owner can create new versions)
    if (!latestVersion.user || !latestVersion.user.equals(context.userId)) {
      const error = new Error(
        "Unauthorized, a leia with this name already exists and you don't have permission to version it"
      );
      error.statusCode = 403;
      throw error;
    }

    if (context.role === 'admin') {
      leiaData.isPublished = publish; // Admin can decide to publish or not when creating a new version
    }

    leiaData.metadata.version = getVersionObjectFromString(leiaData.metadata.version);

    if (!isObjectVersionGreater(leiaData.metadata.version, latestVersion.metadata.version)) {
      const error = new Error(
        'Version must be greater than the latest version: ' +
        `${latestVersion.metadata.version.major}.${latestVersion.metadata.version.minor}.${latestVersion.metadata.version.patch}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Find the entities, save the IDs and convert them to JSON to simplify the object (less computing/problems in object recursion)
    const persona = await findEntity(leiaData.spec.persona, PersonaService, 'Persona not found').then((persona) => {
      leiaData.spec.personaId = persona._id;
      return persona.toJSON();
    });
    const behaviour = await findEntity(leiaData.spec.behaviour, BehaviourService, 'Behaviour not found').then(
      (behaviour) => {
        leiaData.spec.behaviourId = behaviour._id;
        return behaviour.toJSON();
      }
    );
    const problem = await findEntity(leiaData.spec.problem, ProblemService, 'Problem not found').then((problem) => {
      leiaData.spec.problemId = problem._id;
      return problem.toJSON();
    });

    const entities = { persona, behaviour, problem };

    checkConstraints(entities);
    const extendedEntities = resolveExtensions(entities);
    const overriddenEntities = resolveOverrides(extendedEntities);
    const replacedEntities = resolvePlaceholders(overriddenEntities);

    leiaData.spec.persona = replacedEntities.persona;
    leiaData.spec.behaviour = replacedEntities.behaviour;
    leiaData.spec.problem = replacedEntities.problem;

    if ((context.role === 'admin' || context.internal) && publish) {
      leiaData.isPublished = true;
      if (!persona.isPublished) {
        await PersonaService.publish(persona.id, context); // Admin can publish unpublished entities when creating a leia
        leiaData.spec.persona.isPublished = true;
      }
      if (!behaviour.isPublished) {
        await BehaviourService.publish(behaviour.id, context);
        leiaData.spec.behaviour.isPublished = true;
      }
      if (!problem.isPublished) {
        await ProblemService.publish(problem.id, context);
        leiaData.spec.problem.isPublished = true;
      }
    }

    return await LeiaRepository.create(leiaData);
  }

  async publish(id, context = {}) {
    const leia = await LeiaRepository.findById(id);

    if (!leia) {
      const error = new Error('Leia not found');
      error.statusCode = 404;
      throw error;
    }

    // Only admin can publish
    if (context.role !== 'admin' && !context.internal) {
      const error = new Error('Unauthorized, only admin can publish a leia');
      error.statusCode = 403;
      throw error;
    }

    if (leia.isPublished) {
      return leia; // If already published, do nothing
    }

    leia.isPublished = true;
    return await leia.save();
  }

  async unpublish(id, context = {}) {
    const leia = await LeiaRepository.findById(id);

    if (!leia) {
      const error = new Error('Leia not found');
      error.statusCode = 404;
      throw error;
    }

    // Only admin can unpublish
    if (context.role !== 'admin' && !context.internal) {
      const error = new Error('Unauthorized, only admin can unpublish a leia');
      error.statusCode = 403;
      throw error;
    }

    if (!leia.isPublished) {
      return leia; // If already unpublished, do nothing
    }

    leia.isPublished = false;
    return await leia.save();
  }
  
  // DELETE METHODS

  async deleteById(id, context = {}) {
    const leia = await LeiaRepository.findById(id);
    if (!leia) {
      const error = new Error('Leia not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user owns the leia (only owner can delete) or is admin
    if (context.role !== 'admin' && !context.internal && (!leia.user || !leia.user.equals(context.userId))) {
      const error = new Error("Unauthorized");
      error.statusCode = 403;
      throw error;
    }

    // Check if LEIA is being used in any experiment
    const inUse = await ExperimentService.findByLeiaId(id);
    if (inUse && inUse.length > 0) {
      const error = new Error("LEIA is being used in an experiment");
      error.statusCode = 400;
      error.data = inUse.map((experiment) => ({ id: experiment._id, name: experiment.name }));
      throw error;
    }

    const deletedLeia = await LeiaRepository.deleteById(id);
    return deletedLeia;
  }
}

export default new LeiaService();
