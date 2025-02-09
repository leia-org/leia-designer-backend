import PersonaService from '../services/PersonaService.js';
import { createPersonaValidator, updatePersonaValidator } from '../validators/personaValidator.js';
import { isNotFound } from '../utils/helper.js';
import { isVersionValid } from '../validators/versionValidator.js';

export const createPersona = async (req, res, next) => {
  try {
    const { error, value } = createPersonaValidator.validate(req.body, { abortEarly: false });
    if (error) return next(error); // Pass the error to the error handling middleware.
    // Check if a persona with the same name already exists
    const exists = await PersonaService.existsByName(value.name);
    if (exists) {
      const error = new Error('Persona with the same name already exists');
      error.statusCode = 409;
      throw error;
    }
    const newPersona = await PersonaService.create(value);
    res.status(201).json(newPersona);
  } catch (err) {
    next(err);
  }
};

export const createNewPersonaVersion = async (req, res, next) => {
  try {
    const { error, value } = updatePersonaValidator.validate(req.body, { abortEarly: false });
    if (error) return next(error); // Pass the error to the error handling middleware.
    const { versionType, ...personaData } = value;
    const updatedPersona = await PersonaService.createNewVersion(personaData, versionType);
    res.status(200).json(updatedPersona);
  } catch (err) {
    next(err);
  }
};

export const getPersonaById = async (req, res, next) => {
  try {
    const persona = await PersonaService.findById(req.params.id);
    if (!persona) {
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

export const getPersonaByQuery = async (req, res, next) => {
  try {
    const { name, version } = req.query;
    var result;
    if (name && version == 'latest') {
      result = await PersonaService.findLatestVersionByName(name);
    } else if (name && version) {
      if (!isVersionValid(version)) {
        const error = new Error('Invalid version format, use x.y.z where x, y, z are integers or latest');
        error.statusCode = 400;
        throw error;
      }
      result = await PersonaService.findByNameAndVersion(name, version);
    } else if (name) {
      result = await PersonaService.findByName(name);
    } else {
      result = await PersonaService.findAll();
    }

    if (isNotFound(result)) {
      const error = new Error('Persona not found');
      error.statusCode = 404;
      throw error;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};
