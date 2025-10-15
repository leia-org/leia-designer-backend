import LeiaService from '../../services/v1/LeiaService.js';
import { createLeiaValidator, updateLeiaValidator } from '../../validators/v1/leiaValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';
import { validateVisibility, validateBoolean } from '../../validators/queryValidator.js';

export const createLeia = async (req, res, next) => {
  try {
    const value = await createLeiaValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // database will check if the name and version 1.0.0 exists as it must be unique
    // Public by default only for admins, query only for admins (see service)
    const newLeia = await LeiaService.create(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newLeia);
  } catch (err) {
    next(err);
  }
};

export const createNewLeiaVersion = async (req, res, next) => {
  try {
    const value = await updateLeiaValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // Public by default for admins, query only for admins (see service)
    const newLeia = await LeiaService.createNewVersion(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newLeia);
  } catch (err) {
    next(err);
  }
};

export const getLeiaById = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const leia = await LeiaService.findByIdPopulatedUser(req.params.id, context);
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
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const leias = await LeiaService.findByName(req.params.name, 'all', context);
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

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const leia = await LeiaService.findByNameAndVersion(name, version, context);

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

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const result = await LeiaService.findByQuery(text, version, apiVersion, validateVisibility(req.query.visibility), context);

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const deleteLeiaById = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const deletedLeia = await LeiaService.deleteById(req.params.id, context);
    if (isNotFound(deletedLeia)) {
      const error = new Error('Leia not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(deletedLeia);
  } catch (err) {
    next(err);
  }
};
