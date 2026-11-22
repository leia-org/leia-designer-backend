import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';
import { populateUserInEntity } from '../../utils/authClient.js';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import LeiaService from './LeiaService.js';
import { stageError, validateActivityStages } from '../../utils/activityStages.js';

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

function normalizeOrchestration(leias, orchestration) {
  const multi = orchestration.mode === 'multi';
  if (multi && leias.length < 2) throw stageError('A MultiLEIA stage requires at least two LEIAs');
  if (multi && leias.some((entry) => entry.configuration?.mode === 'transcription')) {
    throw stageError('MultiLEIA currently supports standard text mode only');
  }
  const openingLeiaId = orchestration.openingLeiaId || leias[0]?.id;
  const problemLeiaId = orchestration.problemLeiaId || openingLeiaId;
  if (multi) {
    if (!leias.some((entry) => String(entry.id) === String(openingLeiaId))) {
      throw stageError('Opening LEIA must belong to the stage');
    }
    assertProcessCompatibility(leias, problemLeiaId);
  }
  return {
    mode: orchestration.mode,
    maxInternalTurns: multi ? Math.min(orchestration.maxInternalTurns || 2, 8) : 2,
    openingLeiaId: multi ? String(openingLeiaId) : null,
    problemLeiaId: multi ? String(problemLeiaId) : null,
    sharedTask: orchestration.sharedTask || '',
  };
}

class ExperimentService {
  assertPublishedLeias(leias) {
    const invalid = leias.filter((entry) => entry.leia?.isPublished !== true);
    if (invalid.length) {
      const labels = invalid.map((entry) => entry.leia?.metadata?.name || entry.leia?.id || entry.id || 'Missing LEIA');
      const error = new Error(`All associated LEIAs must exist and be published: ${labels.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // READ METHODS

  async findAccessible(userId, ownedOnly, lastActivityId, text) {
    return await ExperimentRepository.findAccessible(userId, ownedOnly, lastActivityId, text);
  }

  async findAll(lastActivityId, text) {
    const {experiments, nextCursor} = await ExperimentRepository.findAll(lastActivityId, text);
    return await {experiments: await populateUserInEntity(experiments), nextCursor};
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

  async findByUserId(userId, visibility = 'all', populated = false, lastActivityId, text) {
    const {experiments, nextCursor} = await ExperimentRepository.findByUserId(userId, visibility, populated, lastActivityId, text);
    return await {experiments, nextCursor};
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
    const stage = { id: randomUUID() };
    const leias = (experimentData.leias || []).map((entry) => ({ ...entry, stageId: stage.id }));
    return await ExperimentRepository.create({ ...experimentData, leias, stages: [stage] });
  }

  async updateName(id, name) {
    return await ExperimentRepository.update(id, { name });
  }

  async updateStages(id, stages) {
    const experiment = await ExperimentRepository.findByIdPopulated(id);
    if (!experiment) throw stageError('Experiment not found', 404);
    const normalizedStages = stages.map((stage) => ({
      ...stage,
      outputSources: {
        conversation: stage.outputSources?.conversation ?? null,
        submitedSolution: stage.outputSources?.submitedSolution ?? null,
      },
    }));
    validateActivityStages(normalizedStages, experiment.leias, normalizeOrchestration);
    for (const stage of normalizedStages) {
      const entries = experiment.leias.filter((entry) => entry.stageId === stage.id);
      stage.orchestration = normalizeOrchestration(entries, stage.orchestration);
    }
    return await ExperimentRepository.updateStagedDraft(experiment, { stages: normalizedStages });
  }

  //fix to add check for leia before publishing modeled after checkEditable
  async publish(id) {
    const experiment = await ExperimentRepository.findByIdPopulated(id);
    if (!experiment) throw stageError('Experiment not found', 404);
    this.assertPublishedLeias(experiment.leias);
    validateActivityStages(experiment.stages, experiment.leias, normalizeOrchestration, true);
    return await ExperimentRepository.updateStagedDraft(experiment, { isPublished: true });
  }

  async addLeia(experimentId, leiaConfig, context) {
    const experiment = await ExperimentRepository.findByIdPopulated(experimentId);
    if (!experiment) throw stageError('Experiment not found', 404);
    if (!Array.isArray(experiment.stages) || !experiment.stages.length) {
      throw stageError('An activity requires at least one stage');
    }
    const stageId = leiaConfig.stageId || (experiment.stages.length === 1 ? experiment.stages[0].id : null);
    if (!experiment.stages.some((stage) => stage.id === stageId)) throw stageError('Select a stage');
    const leia = await LeiaService.findById(leiaConfig.leia, context);
    if (!leia) throw stageError('LEIA not found', 404);
    const entry = { ...leiaConfig, stageId, _id: new Types.ObjectId() };
    validateActivityStages(experiment.stages, [
      ...experiment.leias, { ...entry, id: String(entry._id), leia },
    ], normalizeOrchestration);
    const { leias } = experiment.toObject({ depopulate: true });
    return await ExperimentRepository.updateStagedDraft(experiment, { leias: [...leias, entry] });
  }

  async updateLeia(experimentId, leiaConfigId, leiaConfig) {
    const draft = await ExperimentRepository.findByIdPopulated(experimentId);
    if (!draft) throw stageError('Experiment not found', 404);
    const existing = draft.leias.find((entry) => entry.id === leiaConfigId);
    if (!existing) throw stageError('LEIA configuration not found', 404);
    const { leias } = draft.toObject({ depopulate: true });
    const entry = leias.find(({ _id }) => String(_id) === leiaConfigId);
    if (String(entry.leia) !== leiaConfig.leia) {
      throw stageError('Remove the existing LEIA and add its replacement to the stage');
    }
    entry.configuration = leiaConfig.configuration;
    const entries = draft.leias.map((candidate) => candidate.id === leiaConfigId
      ? { id: existing.id, stageId: existing.stageId, leia: existing.leia, configuration: entry.configuration }
      : candidate);
    validateActivityStages(draft.stages, entries, normalizeOrchestration);
    return await ExperimentRepository.updateStagedDraft(draft, { leias });
  }

  // DELETE METHODS

  async deleteLeia(experimentId, leiaConfigId) {
    const draft = await ExperimentRepository.findByIdPopulated(experimentId);
    if (!draft) throw stageError('Experiment not found', 404);
    const existing = draft.leias.find((entry) => entry.id === leiaConfigId);
    if (!existing) throw stageError('LEIA configuration not found', 404);
    const { leias, stages } = draft.toObject({ depopulate: true });
    const stage = (stages || []).find(({ id }) => id === existing.stageId);
    if (!stage) throw stageError('Stage not found', 404);
    if (stage.orchestration.mode === 'multi') {
      const remaining = draft.leias.filter((entry) => entry.stageId === stage.id && entry.id !== leiaConfigId);
      const orchestration = stage.orchestration;
      if (remaining.length < 2) orchestration.mode = 'single';
      if (orchestration.openingLeiaId === leiaConfigId) orchestration.openingLeiaId = null;
      if (orchestration.problemLeiaId === leiaConfigId) orchestration.problemLeiaId = null;
      stage.orchestration = normalizeOrchestration(remaining, orchestration);
    }
    return await ExperimentRepository.updateStagedDraft(draft, {
      stages,
      leias: leias.filter(({ _id }) => String(_id) !== leiaConfigId),
    });
  }

  async deleteById(id) {
    return await ExperimentRepository.deleteById(id);
  }
}

export default new ExperimentService();
