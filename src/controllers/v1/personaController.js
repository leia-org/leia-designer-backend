import PersonaService from '../../services/v1/PersonaService.js';
import { createPersonaValidator, updatePersonaValidator } from '../../validators/v1/personaValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';

const checkEditable = async (name, userId) => {
  const persona = await PersonaService.findFirstVersionByName(name);
  if (!persona) {
    const error = new Error('Persona not found, please create a new persona instead');
    error.statusCode = 404;
    throw error;
  }
  if (!persona.user.equals(userId)) {
    const error = new Error(
      "Unauthorized, a persona with this name already exists and you don't have permission to version it"
    );
    error.statusCode = 403;
    throw error;
  }
};

export const createPersona = async (req, res, next) => {
  try {
    const value = await createPersonaValidator.validateAsync(req.body, { abortEarly: false });
    value.user = req.auth?.payload?.id;
    // database will check if the name and version 1.0.0 exists as it must be unique
    const newPersona = await PersonaService.create(value);
    res.status(201).json(newPersona);
  } catch (err) {
    next(err);
  }
};

export const createNewPersonaVersion = async (req, res, next) => {
  try {
    const value = await updatePersonaValidator.validateAsync(req.body, { abortEarly: false });
    await checkEditable(value.metadata.name, req.auth?.payload?.id);
    value.user = req.auth?.payload?.id;
    const newPersona = await PersonaService.createNewVersion(value);
    res.status(201).json(newPersona);
  } catch (err) {
    next(err);
  }
};

export const getPersonaById = async (req, res, next) => {
  try {
    const persona = await PersonaService.findById(req.params.id);
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
    const personas = await PersonaService.findByName(req.params.name);
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

    const persona = await PersonaService.findByNameAndVersion(name, version);

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

    const result = await PersonaService.findByQuery(text, version, apiVersion);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
