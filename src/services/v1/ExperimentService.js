import { validateStages } from '../../utils/stages.js';
import { Types } from 'mongoose';
import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';
import LeiaRepository from '../../repositories/v1/LeiaRepository.js';
import { needsPreviousConversation, validateReflectiveChain } from '../../utils/reflective.js';
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
    if (experiment.user.id !== userId) {
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
    let leias = [];
    if (experimentData.leias?.length) {
      experimentData.leias = experimentData.leias.map((entry) => ({ ...entry, _id: entry._id || entry.id || new Types.ObjectId() }));
      leias = await Promise.all(experimentData.leias.map(async (entry) => ({
        ...entry, leia: await LeiaRepository.findById(entry.leia),
      })));
    }
    if (!experimentData.stages) {
      experimentData.stages = experimentData.orchestration?.mode === 'multi' && leias.length
        ? [{ id: `multi-${leias[0]._id}`, type: 'MultiLEIAStage', version: 1, title: 'MultiLEIA',
          config: { leiaIds: leias.map((entry) => String(entry._id)), orchestration: experimentData.orchestration } }]
        : leias.map((entry, index) => ({ id: `leia-${entry._id}`, type: 'LEIAStage', version: 1,
          title: entry.leia?.metadata?.name || `Stage ${index + 1}`, config: { leiaId: String(entry._id) } }));
    }
    validateStages({ ...experimentData, leias });
    if (experimentData.isPublished && !experimentData.stages.length) throw Object.assign(new Error('Activity must have a stage before publishing'), { statusCode: 400 });
    return await ExperimentRepository.create(experimentData);
  }

  async updateStages(id, stages) {
    const experiment = await this.findByIdPopulated(id);
    if (!experiment) throw Object.assign(new Error('Experiment not found'), { statusCode: 404 });
    validateStages({ leias: experiment.leias, stages });
    return await ExperimentRepository.update(id, { stages });
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

    if (experiment.stages) throw Object.assign(new Error('Configure orchestration on a MultiLEIAStage'), { statusCode: 409 });
    const leias = experiment.leias || [];
    validateReflectiveChain({ leias, orchestration });
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
          ? Math.min(orchestration.maxInternalTurns || 2, 8)
          : 2,
      openingLeiaId: orchestration.mode === 'multi' ? openingLeiaId : null,
      problemLeiaId: orchestration.mode === 'multi' ? problemLeiaId : null,
      sharedTask: orchestration.sharedTask || '',
    });
  }

  //fix to add check for leia before publishing modeled after checkEditable
  async publish(id) {
    const experiment = await this.findByIdPopulated(id);
    validateReflectiveChain(experiment);
    if (Array.isArray(experiment.stages)) {
      if (!experiment.stages.length) throw Object.assign(new Error('Activity must have a stage before publishing'), { statusCode: 400 });
      return await ExperimentRepository.update(id, { isPublished: true });
    }
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
    const experiment = await this.findByIdPopulated(experimentId);
    const leia = await LeiaRepository.findById(leiaConfig.leia);
    validateReflectiveChain({ stages: experiment.stages, orchestration: experiment.orchestration, leias: [...experiment.leias, { ...leiaConfig, leia }] });
    return await ExperimentRepository.addLeia(experimentId, leiaConfig);
  }

  async updateLeia(experimentId, leiaConfigId, leiaConfig) {
    const experiment = await this.findByIdPopulated(experimentId);
    const leia = await LeiaRepository.findById(leiaConfig.leia);
    validateReflectiveChain({ stages: experiment.stages, orchestration: experiment.orchestration, leias: experiment.leias.map((entry) =>
      String(entry.id) === String(leiaConfigId) ? { ...leiaConfig, leia } : entry) });
    if (
      !experiment.stages && experiment?.orchestration?.mode === 'multi' &&
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
    const experiment = await this.findByIdPopulated(experimentId);
    if (experiment.stages?.some((stage) => stage.config.leiaId === String(leiaConfigId) || stage.config.leiaIds?.includes(String(leiaConfigId)))) {
      throw Object.assign(new Error('Remove this LEIA from its stages before deleting it'), { statusCode: 409 });
    }
    const entries = experiment.leias || [];
    const index = entries.findIndex((entry) => String(entry.id) === String(leiaConfigId));
    if (!experiment.stages && index >= 0 && needsPreviousConversation(entries[index + 1])) {
      const error = new Error('Remove the following LEIA using previous conversation context first');
      error.statusCode = 400;
      throw error;
    }
    const updatedExperiment = await ExperimentRepository.deleteLeia(experimentId, leiaConfigId);
    if (experiment.stages || experiment?.orchestration?.mode !== 'multi') return updatedExperiment;

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
      maxInternalTurns: Math.min(orchestration.maxInternalTurns || 2, 8),
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
