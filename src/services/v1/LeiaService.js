import LeiaRepository from '../../repositories/v1/LeiaRepository.js';
import { getVersionObjectFromString, isObjectVersionGreater } from '../../utils/versioning.js';
import PersonaService from './PersonaService.js';
import BehaviourService from './BehaviourService.js';
import ProblemService from './ProblemService.js';
import { findEntity } from '../../utils/entity.js';
import { checkConstraints, resolveExtensions, resolveOverrides } from '../../utils/leia.js';

class LeiaService {
  // READ METHODS

  async findAll() {
    return await LeiaRepository.findAll();
  }

  async findById(id) {
    return await LeiaRepository.findById(id);
  }

  async existsByName(name) {
    return await LeiaRepository.existsByName(name);
  }

  async findByName(name) {
    return await LeiaRepository.findByName(name);
  }

  async findLatestVersionByName(name) {
    return await LeiaRepository.findLatestVersionByName(name);
  }

  async findByNameAndVersion(name, version) {
    if (version === 'latest') {
      return await LeiaRepository.findLatestVersionByName(name);
    } else {
      version = getVersionObjectFromString(version);
      return await LeiaRepository.findByNameAndVersion(name, version);
    }
  }

  async findByQuery(text, version, apiVersion) {
    if (version && version !== 'latest') {
      version = getVersionObjectFromString(version);
    }
    return await LeiaRepository.findByQuery(text, version, apiVersion);
  }

  // WRITE METHODS
  async create(leiaData) {
    const persona = await findEntity(leiaData.spec.persona, PersonaService, 'Persona not found');
    const behaviour = await findEntity(leiaData.spec.behaviour, BehaviourService, 'Behaviour not found');
    const problem = await findEntity(leiaData.spec.problem, ProblemService, 'Problem not found');

    // Save the IDs of the entities
    leiaData.spec.personaId = persona._id;
    leiaData.spec.behaviourId = behaviour._id;
    leiaData.spec.problemId = problem._id;

    const entities = { persona, behaviour, problem };

    checkConstraints(entities);
    const extendedEntities = resolveExtensions(entities);
    const overriddenEntities = resolveOverrides(extendedEntities);

    leiaData.spec.persona = overriddenEntities.persona;
    leiaData.spec.behaviour = overriddenEntities.behaviour;
    leiaData.spec.problem = overriddenEntities.problem;

    delete leiaData.metadata.version; // Remove to set the version to 1.0.0

    return await LeiaRepository.create(leiaData);
  }

  async createNewVersion(leiaData) {
    const latestVersion = await LeiaRepository.findLatestVersionByName(leiaData.metadata.name);

    if (!latestVersion) {
      const error = new Error('Leia not found, please create a new leia instead');
      error.statusCode = 404;
      throw error;
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

    const persona = await findEntity(leiaData.spec.persona, PersonaService, 'Persona not found');
    const behaviour = await findEntity(leiaData.spec.behaviour, BehaviourService, 'Behaviour not found');
    const problem = await findEntity(leiaData.spec.problem, ProblemService, 'Problem not found');

    // Save the IDs of the entities
    leiaData.spec.personaId = persona._id;
    leiaData.spec.behaviourId = behaviour._id;
    leiaData.spec.problemId = problem._id;

    const entities = { persona, behaviour, problem };

    checkConstraints(entities);
    const extendedEntities = resolveExtensions(entities);
    const overriddenEntities = resolveOverrides(extendedEntities);

    leiaData.spec.persona = overriddenEntities.persona;
    leiaData.spec.behaviour = overriddenEntities.behaviour;
    leiaData.spec.problem = overriddenEntities.problem;

    return await LeiaRepository.create(leiaData);
  }
}

export default new LeiaService();
