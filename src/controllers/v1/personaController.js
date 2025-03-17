import PersonaService from '../../services/v1/PersonaService.js';
import { createPersonaValidator, updatePersonaValidator } from '../../validators/v1/personaValidator.js';
import { isNotFound } from '../../utils/helper.js';
import { isVersionQueryValid, isApiVersionValid } from '../../validators/versionValidator.js';

export const createPersona = async (req, res, next) => {
  try {
    const value = await createPersonaValidator.validateAsync(req.body, { abortEarly: false });
    const newPersona = await PersonaService.create(value);
    res.status(201).json(newPersona);
  } catch (err) {
    next(err);
  }
};

export const createNewPersonaVersion = async (req, res, next) => {
  try {
    const value = await updatePersonaValidator.validateAsync(req.body, { abortEarly: false });
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
