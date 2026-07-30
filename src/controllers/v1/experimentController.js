import ExperimentService from '../../services/v1/ExperimentService.js';
import WorkbenchService from '../../services/v1/WorkbenchService.js';
import {
  createExperimentValidator,
  updateExperimentNameValidator,
  leiaConfigValidator,
  createExperimentReplicationValidator
} from '../../validators/v1/experimentValidator.js';
import { validateBoolean, validateVisibility } from '../../validators/queryValidator.js';

export const createExperiment = async (req, res, next) => {
  try {
    const value = await createExperimentValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    const newExperiment = await ExperimentService.create(value);
    res.status(201).json(newExperiment);
  } catch (err) {
    next(err);
  }
};

export const getExperimentById = async (req, res, next) => {
  try {
    const experimentId = req.params.id;
    const experiment = await ExperimentService.findByIdPopulated(experimentId);
    if (!experiment) {
      const error = new Error('Experiment not found');
      error.statusCode = 404;
      throw error;
    }
    if (experiment.user.id == req.auth?.payload?.id || req.auth?.payload?.role === 'admin') {
      res.json(experiment);
    } else {
      const error = new Error('Unauthorized: You do not have permission to access this experiment');
      error.statusCode = 403;
      throw error;
    }
  } catch (err) {
    next(err);
  }
};

export const getAllExperiments = async (req, res, next) => {
  try {
    const experiments = await ExperimentService.findAll();
    res.json(experiments);
  } catch (err) {
    next(err);
  }
};

export const getAllExperimentsByUser = async (req, res, next) => {
  try {
    const visibility = validateVisibility(req.query.visibility);
    const populated = validateBoolean(req.query.populated, false);
    const userId = req.auth?.payload?.id;
    const experiments = await ExperimentService.findByUserId(userId, visibility, populated);
    res.json(experiments);
  } catch (err) {
    next(err);
  }
};

export const updateExperimentName = async (req, res, next) => {
  try {
    const value = await updateExperimentNameValidator.validateAsync(req.body, { abortEarly: false });

    const userId = req.auth?.payload?.id;
    const experimentId = req.params.id;
    await ExperimentService.checkEditable(experimentId, userId);

    const updatedExperiment = await ExperimentService.updateName(experimentId, value.name);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const addExperimentLeia = async (req, res, next) => {
  try {
    const value = await leiaConfigValidator.validateAsync(req.body, { abortEarly: false });

    const userId = req.auth?.payload?.id;
    const experimentId = req.params.id;
    await ExperimentService.checkEditable(experimentId, userId);

    const updatedExperiment = await ExperimentService.addLeia(experimentId, value);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const updateExperimentLeia = async (req, res, next) => {
  try {
    const value = await leiaConfigValidator.validateAsync(req.body, { abortEarly: false });

    const userId = req.auth?.payload?.id;
    const experimentId = req.params.id;
    await ExperimentService.checkEditable(experimentId, userId);

    const updatedExperiment = await ExperimentService.updateLeia(experimentId, req.params.leiaId, value);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const deleteExperimentLeia = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const experimentId = req.params.id;
    await ExperimentService.checkEditable(experimentId, userId);

    const updatedExperiment = await ExperimentService.deleteLeia(experimentId, req.params.leiaId);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const publishExperiment = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const experimentId = req.params.id;
    await ExperimentService.checkEditable(experimentId, userId);

    const updatedExperiment = await ExperimentService.publish(experimentId);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const deleteExperimentById = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const experimentId = req.params.id;
    await ExperimentService.checkEditable(experimentId, userId);

    const deletedExperiment = await ExperimentService.deleteById(experimentId);
    res.json(deletedExperiment);
  } catch (err) {
    next(err);
  }
};
export const createExperimentReplication = async (req, res, next) => {
  try {
    const value = await createExperimentReplicationValidator.validateAsync(req.body, { abortEarly: false });
    const userId = req.auth?.payload?.id;
    const existsActivity = await ExperimentService.checkNameExists(value.leiaName);
    if (existsActivity) {
      return res.status(409).json({ error: 'Activity name already exists' });
    }
    const existsReplication = await WorkbenchService.replicationNameExists(value.leiaName, req.headers.authorization);
    if (existsReplication) {
      return res.status(409).json({ error: 'Replication name already exists' });
    }
    const newExperiment = await ExperimentService.create({
      name: value.leiaName,
      user: userId,
      leias: [{ leia: value.leiaId }],
      isPublished: true
    });
    const newReplication = await WorkbenchService.createReplication(newExperiment.id, value.leiaName, req.headers.authorization);
    res.status(201).json({ experiment: newExperiment, replication: newReplication });
  } catch (err) {
    next(err);
  }
};
