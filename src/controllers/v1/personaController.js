import PersonaService from '../../services/v1/PersonaService.js';
import { createPersonaValidator, updatePersonaValidator } from '../../validators/v1/personaValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';
import { validateVisibility, validateBoolean } from '../../validators/queryValidator.js';

export const createPersona = async (req, res, next) => {
  try {
    const value = await createPersonaValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // database will check if the name and version 1.0.0 exists as it must be unique
    // Public by default only for admins, query only for admins (see service)
    const newPersona = await PersonaService.create(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newPersona);
  } catch (err) {
    next(err);
  }
};

export const createNewPersonaVersion = async (req, res, next) => {
  try {
    const value = await updatePersonaValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;

    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    // Public by default for admins, query only for admins (see service)
    const newPersona = await PersonaService.createNewVersion(value, context, validateBoolean(req.query.publish, true));
    res.status(201).json(newPersona);
  } catch (err) {
    next(err);
  }
};

export const getPersonaById = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };
    const persona = await PersonaService.findByIdPopulatedUser(req.params.id, context);
    if (isNotFound(persona)) {
      const error = new Error('Persona not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(persona);
  } catch (err) {
    next(err);
  }
};

export const existsPersonaByName = async (req, res, next) => {
  try {
    const exists = await PersonaService.existsByName(req.params.name);
    res.json({ exists });
  } catch (err) {
    next(err);
  }
};

export const getPersonasByName = async (req, res, next) => {
  try {
    const context = {
      userId: req.auth?.payload?.id,
      role: req.auth?.payload?.role
    };

    const personas = await PersonaService.findByName(req.params.name, validateVisibility(req.query.visibility), context);
    res.json(personas);
  } catch (err) {
    next(err);
  }
};

export const getPersonaByNameAndVersion = async (req, res, next) => {
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

    const persona = await PersonaService.findByNameAndVersion(name, version, context);

    if (isNotFound(persona)) {
      const error = new Error('Persona not found');
      error.statusCode = 404;
      throw error;
    }
    res.json(persona);
  } catch (err) {
    next(err);
  }
};

export const getPersonasByQuery = async (req, res, next) => {
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

    const result = await PersonaService.findByQuery(text, version, apiVersion, validateVisibility(req.query.visibility), context);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
