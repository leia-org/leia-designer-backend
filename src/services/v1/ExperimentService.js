import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';
import { populateUserInEntity } from '../../utils/authClient.js';

function normalizeProcess(process) {
  if (!Array.isArray(process)) return '';
  return process
    .map((value) => String(value).trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

function assertProcessCompatibility(leias, problemLeiaId) {
  const problemEntry = leias.find((entry) => String(entry.id) === String(problemLeiaId));
  if (!problemEntry) {
    const error = new Error('Shared problem LEIA must belong to the activity');
    error.statusCode = 400;
    throw error;
  }

  const sharedProcess = normalizeProcess(problemEntry.leia?.spec?.problem?.spec?.process);
  const incompatibleLeias = leias
    .filter(
      (entry) =>
        normalizeProcess(entry.leia?.spec?.behaviour?.spec?.process) !== sharedProcess
    )
    .map((entry) => ({
      leiaId: String(entry.id),
      name: entry.leia?.metadata?.name || String(entry.id),
    }));
  if (incompatibleLeias.length > 0) {
    const error = new Error('Every MultiLEIA behaviour must use the shared problem process');
    error.statusCode = 400;
    error.incompatibleLeias = incompatibleLeias;
    throw error;
  }
}

class ExperimentService {

  // READ METHODS

  async findAll() {
    const experiments = await ExperimentRepository.findAll();
    return await populateUserInEntity(experiments);
  }

  async findById(id) {
    const experiment = await ExperimentRepository.findById(id);
    return await populateUserInEntity(experiment);
  }

  async findByIdPopulated(id) {
    const experiment = await ExperimentRepository.findByIdPopulated(id);
    return await populateUserInEntity(experiment);
  }

  async existsByLeiaId(leiaId) {
    return await ExperimentRepository.existsByLeiaId(leiaId);
  }

  async findByLeiaId(leiaId) {
    const experiment = await ExperimentRepository.findByLeiaId(leiaId);
    return await populateUserInEntity(experiment);
  }

  async findByUserId(userId, visibility = 'all', populated = false) {
    const experiments = await ExperimentRepository.findByUserId(userId, visibility, populated);
    return await populateUserInEntity(experiments);
  }

  async checkEditable(experimentId, userId) {
    const experiment = await this.findById(experimentId);
    if (!experiment) {
      const error = new Error('Experiment not found');
      error.statusCode = 404;
      throw error;
    }
    if (!experiment.user.equals(userId)) {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }
    if (experiment.isPublished) {
      const error = new Error('Experiment is published');
      error.statusCode = 409;
      throw error;
    }
  }
  async checkNameExists(name) {
    return await ExperimentRepository.existsByName(name);
  }
  // WRITE METHODS

  async create(experimentData) {
    return await ExperimentRepository.create(experimentData);
  }

  async updateName(id, name) {
    return await ExperimentRepository.update(id, { name });
  }

  async updateOrchestration(id, orchestration) {
    const experiment = await this.findByIdPopulated(id);
    if (!experiment) {
      const error = new Error('Experiment not found');
      error.statusCode = 404;
      throw error;
    }

    const leias = experiment.leias || [];
    if (orchestration.mode === 'multi' && leias.length < 2) {
      const error = new Error('A MultiLEIA activity requires at least two LEIAs');
      error.statusCode = 400;
      throw error;
    }
    if (
      orchestration.mode === 'multi' &&
      leias.some((entry) => entry.configuration?.mode === 'transcription')
    ) {
      const error = new Error('MultiLEIA activities currently support standard text mode only');
      error.statusCode = 400;
      throw error;
    }

    const leiaIds = new Set(leias.map((entry) => String(entry.id)));
    const openingLeiaId =
      orchestration.openingLeiaId || (leias[0] ? String(leias[0].id) : null);
    const problemLeiaId =
      orchestration.problemLeiaId || openingLeiaId || (leias[0] ? String(leias[0].id) : null);
    if (
      orchestration.mode === 'multi' &&
      (!openingLeiaId || !leiaIds.has(String(openingLeiaId)))
    ) {
      const error = new Error('Opening LEIA must belong to the activity');
      error.statusCode = 400;
      throw error;
    }
    if (
      orchestration.mode === 'multi' &&
      (!problemLeiaId || !leiaIds.has(String(problemLeiaId)))
    ) {
      const error = new Error('Shared problem LEIA must belong to the activity');
      error.statusCode = 400;
      throw error;
    }
    if (orchestration.mode === 'multi') {
      assertProcessCompatibility(leias, problemLeiaId);
    }

    return await ExperimentRepository.updateOrchestration(id, {
      mode: orchestration.mode,
      maxInternalTurns:
        orchestration.mode === 'multi'
          ? Math.min(orchestration.maxInternalTurns || 2, leias.length)
          : 2,
      openingLeiaId: orchestration.mode === 'multi' ? openingLeiaId : null,
      problemLeiaId: orchestration.mode === 'multi' ? problemLeiaId : null,
      sharedTask: orchestration.sharedTask || '',
    });
  }

  //fix to add check for leia before publishing modeled after checkEditable
  async publish(id) {
    const experiment = await this.findByIdPopulated(id);
    if (!experiment.leias || experiment.leias.length === 0) {
      const error = new Error('Experiment must have an associated LEIA before publishing');
      error.statusCode = 400;
      throw error;
    }
    if (experiment.orchestration?.mode === 'multi') {
      if (experiment.leias.length < 2) {
        const error = new Error('A MultiLEIA activity requires at least two LEIAs before publishing');
        error.statusCode = 400;
        throw error;
      }
      if (experiment.leias.some((entry) => entry.configuration?.mode === 'transcription')) {
        const error = new Error('MultiLEIA activities currently support standard text mode only');
        error.statusCode = 400;
        throw error;
      }
      const problemLeiaId =
        experiment.orchestration.problemLeiaId ||
        experiment.orchestration.openingLeiaId ||
        experiment.leias[0].id;
      assertProcessCompatibility(experiment.leias, problemLeiaId);
    }
    return await ExperimentRepository.update(id, { isPublished: true });
  }

  async addLeia(experimentId, leiaConfig) {
    return await ExperimentRepository.addLeia(experimentId, leiaConfig);
  }

  async updateLeia(experimentId, leiaConfigId, leiaConfig) {
    const experiment = await this.findById(experimentId);
    if (
      experiment?.orchestration?.mode === 'multi' &&
      leiaConfig.configuration?.mode === 'transcription'
    ) {
      const error = new Error('MultiLEIA activities currently support standard text mode only');
      error.statusCode = 400;
      throw error;
    }
    return await ExperimentRepository.updateLeia(experimentId, leiaConfigId, leiaConfig);
  }

  // DELETE METHODS

  async deleteLeia(experimentId, leiaConfigId) {
    const experiment = await this.findById(experimentId);
    const updatedExperiment = await ExperimentRepository.deleteLeia(experimentId, leiaConfigId);
    if (experiment?.orchestration?.mode !== 'multi') return updatedExperiment;

    if (updatedExperiment.leias.length < 2) {
      return await ExperimentRepository.updateOrchestration(experimentId, {
        mode: 'single',
        maxInternalTurns: 2,
        openingLeiaId: null,
        problemLeiaId: null,
        sharedTask: experiment.orchestration?.sharedTask || '',
      });
    }
    const removedOpeningLeia =
      String(experiment.orchestration?.openingLeiaId) === String(leiaConfigId);
    const removedProblemLeia =
      String(experiment.orchestration?.problemLeiaId) === String(leiaConfigId);
    const orchestration =
      typeof experiment.orchestration?.toObject === 'function'
        ? experiment.orchestration.toObject()
        : { ...experiment.orchestration };
    return await ExperimentRepository.updateOrchestration(experimentId, {
      ...orchestration,
      maxInternalTurns: Math.min(
        orchestration.maxInternalTurns || 2,
        updatedExperiment.leias.length
      ),
      openingLeiaId: removedOpeningLeia
        ? updatedExperiment.leias[0].id
        : orchestration.openingLeiaId,
      problemLeiaId: removedProblemLeia
        ? updatedExperiment.leias[0].id
        : orchestration.problemLeiaId,
    });
  }

  async deleteById(id) {
    return await ExperimentRepository.deleteById(id);
  }
}

export default new ExperimentService();
