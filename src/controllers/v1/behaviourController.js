import BehaviourService from '../../services/v1/BehaviourService.js';
import { createBehaviourValidator, updateBehaviourValidator } from '../../validators/v1/behaviourValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';

export const createBehaviour = async (req, res, next) => {
  try {
    const { error, value } = createBehaviourValidator.validate(req.body, { abortEarly: false });
    if (error) return next(error); // Pass the error to the error handling middleware.
    const newBehaviour = await BehaviourService.create(value);
    res.status(201).json(newBehaviour);
  } catch (err) {
    next(err);
  }
};

export const createNewBehaviourVersion = async (req, res, next) => {
  try {
    const { error, value } = updateBehaviourValidator.validate(req.body, { abortEarly: false });
    if (error) return next(error); // Pass the error to the error handling middleware.
    const newBehaviour = await BehaviourService.createNewVersion(value);
    res.status(201).json(newBehaviour);
  } catch (err) {
    next(err);
  }
};

export const getBehaviourById = async (req, res, next) => {
  try {
    const behaviour = await BehaviourService.findById(req.params.id);
    if (isNotFound(behaviour)) {
      const error = new Error('Behaviour not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(behaviour);
  } catch (err) {
    next(err);
  }
};

export const existsBehaviourByName = async (req, res, next) => {
  try {
    const exists = await BehaviourService.existsByName(req.params.name);
    res.json({ exists });
  } catch (err) {
    next(err);
  }
};

export const getBehavioursByName = async (req, res, next) => {
  try {
    const behaviours = await BehaviourService.findByName(req.params.name);
    res.json(behaviours);
  } catch (err) {
    next(err);
  }
};

export const getBehaviourByNameAndVersion = async (req, res, next) => {
  try {
    const { name, version } = req.params;

    if (version && !isVersionQueryValid(version)) {
      const error = new Error('Invalid version format');
      error.statusCode = 400;
      throw error;
    }

    const behaviour = await BehaviourService.findByNameAndVersion(name, version);

    if (isNotFound(behaviour)) {
      const error = new Error('Behaviour not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(behaviour);
  } catch (err) {
    next(err);
  }
};

export const getBehavioursByQuery = async (req, res, next) => {
  try {
    const { text, version, apiVersion } = req.query;

    if (version && !isVersionQueryValid(version)) {
      const error = new Error('Invalid version format');
      error.statusCode = 400;
      throw error;
    }

    if (apiVersion && !isApiVersionValid(apiVersion)) {
      const error = new Error('Invalid apiVersion format');
      error.statusCode = 400;
      throw error;
    }

    const result = await BehaviourService.findByQuery(text, version, apiVersion);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
