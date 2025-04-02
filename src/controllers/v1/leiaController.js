import LeiaService from '../../services/v1/LeiaService.js';
import { createLeiaValidator, updateLeiaValidator } from '../../validators/v1/leiaValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';

const checkEditable = async (name, userId) => {
  const leia = await LeiaService.findFirstVersionByName(name);
  if (!leia) {
    const error = new Error('Leia not found, please create a new leia instead');
    error.statusCode = 404;
    throw error;
  }
  if (!leia.user.equals(userId)) {
    const error = new Error(
      "Unauthorized, a leia with this name already exists and you don't have permission to version it"
    );
    error.statusCode = 403;
    throw error;
  }
};

export const createLeia = async (req, res, next) => {
  try {
    const value = await createLeiaValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    // database will check if the name and version 1.0.0 exists as it must be unique
    const newLeia = await LeiaService.create(value);
    res.status(201).json(newLeia);
  } catch (err) {
    next(err);
  }
};

export const createNewLeiaVersion = async (req, res, next) => {
  try {
    const value = await updateLeiaValidator.validateAsync(req.body, { abortEarly: false });
    await checkEditable(value.metadata.name, req.auth?.payload?.id);
    value.user = req.auth?.payload?.id;
    const newLeia = await LeiaService.createNewVersion(value);
    res.status(201).json(newLeia);
  } catch (err) {
    next(err);
  }
};

export const getLeiaById = async (req, res, next) => {
  try {
    const leia = await LeiaService.findById(req.params.id);
    if (isNotFound(leia)) {
      const error = new Error('Leia not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(leia);
  } catch (err) {
    next(err);
  }
};

export const existsLeiaByName = async (req, res, next) => {
  try {
    const exists = await LeiaService.existsByName(req.params.name);
    res.json({ exists });
  } catch (err) {
    next(err);
  }
};

export const getLeiasByName = async (req, res, next) => {
  try {
    const leias = await LeiaService.findByName(req.params.name);
    res.json(leias);
  } catch (err) {
    next(err);
  }
};

export const getLeiaByNameAndVersion = async (req, res, next) => {
  try {
    const { name, version } = req.params;

    if (version && !isVersionQueryValid(version)) {
      const error = new Error('Invalid version format');
      error.statusCode = 400;
      throw error;
    }

    const leia = await LeiaService.findByNameAndVersion(name, version);

    if (isNotFound(leia)) {
      const error = new Error('Leia not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(leia);
  } catch (err) {
    next(err);
  }
};

export const getLeiasByQuery = async (req, res, next) => {
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

    const result = await LeiaService.findByQuery(text, version, apiVersion);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
