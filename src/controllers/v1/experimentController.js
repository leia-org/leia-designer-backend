import ExperimentService from '../../services/v1/ExperimentService.js';
import {
  createExperimentValidator,
  updateExperimentNameValidator,
  updateExperimentDurationValidator,
  leiaConfigValidator,
} from '../../validators/v1/experimentValidator.js';

export const createExperiment = async (req, res, next) => {
  try {
    const value = await createExperimentValidator.validateAsync(req.body, { abortEarly: false });
    const newExperiment = await ExperimentService.create(value);
    res.status(201).json(newExperiment);
  } catch (err) {
    next(err);
  }
};

export const getExperimentById = async (req, res, next) => {
  try {
    const experiment = await ExperimentService.findById(req.params.id);
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

export const updateExperimentName = async (req, res, next) => {
  try {
    const value = await updateExperimentNameValidator.validateAsync(req.body, { abortEarly: false });
    const updatedExperiment = await ExperimentService.updateName(req.params.id, value.name);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const regenerateExperimentCode = async (req, res, next) => {
  try {
    const updatedExperiment = await ExperimentService.regenerateCode(req.params.id);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const toggleExperimentIsActive = async (req, res, next) => {
  try {
    const updatedExperiment = await ExperimentService.toggleIsActive(req.params.id);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const updateExperimentDuration = async (req, res, next) => {
  try {
    const value = await updateExperimentDurationValidator.validateAsync(req.body, { abortEarly: false });
    const updatedExperiment = await ExperimentService.updateDuration(req.params.id, value.duration);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const addExperimentLeia = async (req, res, next) => {
  try {
    const value = await leiaConfigValidator.validateAsync(req.body, { abortEarly: false });
    const updatedExperiment = await ExperimentService.addLeia(req.params.id, value);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const updateExperimentLeia = async (req, res, next) => {
  try {
    const value = await leiaConfigValidator.validateAsync(req.body, { abortEarly: false });
    const updatedExperiment = await ExperimentService.updateLeia(req.params.id, req.params.leiaId, value);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};

export const deleteExperimentLeia = async (req, res, next) => {
  try {
    const updatedExperiment = await ExperimentService.deleteLeia(req.params.id, req.params.leiaId);
    res.json(updatedExperiment);
  } catch (err) {
    next(err);
  }
};
