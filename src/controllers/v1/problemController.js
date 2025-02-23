import ProblemService from '../../services/v1/ProblemService.js';
import { createProblemValidator, updateProblemValidator } from '../../validators/v1/problemValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';

export const createProblem = async (req, res, next) => {
  try {
    const { error, value } = createProblemValidator.validate(req.body, { abortEarly: false });
    if (error) return next(error); // Pass the error to the error handling middleware.
    const newProblem = await ProblemService.create(value);
    res.status(201).json(newProblem);
  } catch (err) {
    next(err);
  }
};

export const createNewProblemVersion = async (req, res, next) => {
  try {
    const { error, value } = updateProblemValidator.validate(req.body, { abortEarly: false });
    if (error) return next(error); // Pass the error to the error handling middleware.
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
