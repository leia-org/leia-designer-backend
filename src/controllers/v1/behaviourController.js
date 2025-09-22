import BehaviourService from '../../services/v1/BehaviourService.js';
import { createBehaviourValidator, updateBehaviourValidator } from '../../validators/v1/behaviourValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';
import { validateVisibility, validateBoolean, validateProcess } from '../../validators/queryValidator.js';

export const createBehaviour = async (req, res, next) => {
  try {
    const value = await createBehaviourValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // database will check if the name and version 1.0.0 exists as it must be unique
    // Public by default only for admins, query only for admins (see service)
    const newBehaviour = await BehaviourService.create(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newBehaviour);
  } catch (err) {
    next(err);
  }
};

export const createNewBehaviourVersion = async (req, res, next) => {
  try {
    const value = await updateBehaviourValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // Public by default for admins, query only for admins (see service)
    const newBehaviour = await BehaviourService.createNewVersion(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newBehaviour);
  } catch (err) {
    next(err);
  }
};

export const getBehaviourById = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const behaviour = await BehaviourService.findByIdPopulatedUser(req.params.id, context);
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
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const behaviours = await BehaviourService.findByName(req.params.name, validateVisibility(req.query.visibility), context);
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

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const behaviour = await BehaviourService.findByNameAndVersion(name, version, context);

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
    const { text, version, apiVersion, process, visibility } = req.query;

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

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const result = await BehaviourService.findByQuery(
      text,
      version,
      apiVersion,
      validateProcess(process),
      validateVisibility(visibility),
      context
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};
