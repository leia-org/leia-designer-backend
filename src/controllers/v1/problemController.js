import ProblemService from '../../services/v1/ProblemService.js';
import { createProblemValidator, updateProblemValidator } from '../../validators/v1/problemValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';

const checkEditable = async (name, userId) => {
  const problem = await ProblemService.findFirstVersionByName(name);
  if (!problem) {
    const error = new Error('Problem not found, please create a new problem instead');
    error.statusCode = 404;
    throw error;
  }
  if (!problem.user.equals(userId)) {
    const error = new Error(
      "Unauthorized, a problem with this name already exists and you don't have permission to version it"
    );
    error.statusCode = 403;
    throw error;
  }
};

export const createProblem = async (req, res, next) => {
  try {
    const value = await createProblemValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    // database will check if the name and version 1.0.0 exists as it must be unique
    const newProblem = await ProblemService.create(value);
    res.status(201).json(newProblem);
  } catch (err) {
    next(err);
  }
};

export const createNewProblemVersion = async (req, res, next) => {
  try {
    const value = await updateProblemValidator.validateAsync(req.body, { abortEarly: false });
    await checkEditable(value.metadata.name, req.auth?.payload?.id);
    value.user = req.auth?.payload?.id;
    const newProblem = await ProblemService.createNewVersion(value);
    res.status(201).json(newProblem);
  } catch (err) {
    next(err);
  }
};

export const getProblemById = async (req, res, next) => {
  try {
    const problem = await ProblemService.findById(req.params.id);
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
    const problems = await ProblemService.findByName(req.params.name);
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

    const problem = await ProblemService.findByNameAndVersion(name, version);

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

    const result = await ProblemService.findByQuery(text, version, apiVersion);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
