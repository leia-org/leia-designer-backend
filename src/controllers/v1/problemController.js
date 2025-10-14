import ProblemService from '../../services/v1/ProblemService.js';
import { createProblemValidator, updateProblemValidator } from '../../validators/v1/problemValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';
import { validateVisibility, validateBoolean, validateProcess } from '../../validators/queryValidator.js';

export const createProblem = async (req, res, next) => {
  try {
    const value = await createProblemValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // database will check if the name and version 1.0.0 exists as it must be unique
    // Public by default only for admins, query only for admins (see service)
    const newProblem = await ProblemService.create(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newProblem);
  } catch (err) {
    next(err);
  }
};

export const createNewProblemVersion = async (req, res, next) => {
  try {
    const value = await updateProblemValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // Public by default for admins, query only for admins (see service)
    const newProblem = await ProblemService.createNewVersion(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newProblem);
  } catch (err) {
    next(err);
  }
};

export const getProblemById = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const problem = await ProblemService.findByIdPopulatedUser(req.params.id, context);
    if (isNotFound(problem)) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(problem);
  } catch (err) {
    next(err);
  }
};

export const existsProblemByName = async (req, res, next) => {
  try {
    const exists = await ProblemService.existsByName(req.params.name);
    res.json({ exists });
  } catch (err) {
    next(err);
  }
};

export const getProblemsByName = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const problems = await ProblemService.findByName(req.params.name, validateVisibility(req.query.visibility), context);
    res.json(problems);
  } catch (err) {
    next(err);
  }
};

export const getProblemByNameAndVersion = async (req, res, next) => {
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

    const problem = await ProblemService.findByNameAndVersion(name, version, context);

    if (isNotFound(problem)) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(problem);
  } catch (err) {
    next(err);
  }
};

export const getProblemsByQuery = async (req, res, next) => {
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

    const result = await ProblemService.findByQuery(
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

export const deleteProblemById = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const problem = await ProblemService.deleteById(req.params.id, context);
    if (isNotFound(problem)) {
      const error = new Error('Problem not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(problem);
  } catch (err) {
    next(err);
  }
};
