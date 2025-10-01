import ExperimentService from '../../services/v1/ExperimentService.js';
import {
  createExperimentValidator,
  updateExperimentNameValidator,
  leiaConfigValidator,
} from '../../validators/v1/experimentValidator.js';
import { validateVisibility } from '../../validators/queryValidator.js';

async function checkEditable(experimentId, userId) {
  const experiment = await ExperimentService.findById(experimentId);
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
    error.statusCode = 403;
    throw error;
  }
}

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
    res.json(experiment);
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
    const userId = req.auth?.payload?.id;
    const experiments = await ExperimentService.findByUserId(userId, visibility);
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
    await checkEditable(experimentId, userId);

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
    await checkEditable(experimentId, userId);

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
    await checkEditable(experimentId, userId);

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
    await checkEditable(experimentId, userId);

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
    await checkEditable(experimentId, userId);

    const updatedExperiment = await ExperimentService.publish(experimentId);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};
