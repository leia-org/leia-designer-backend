import RubricService from '../services/v1/RubricService.js';
import { createRubricValidator, updateRubricValidator } from '../validators/v1/rubricValidator.js';
import rubricDefinitionSchema from '../schemas/v1/rubricSchema.js';

const currentUserId = (req) => req.auth.payload.id;

export const getRubricSchema = (_req, res) => res.type('application/schema+json').json(rubricDefinitionSchema);

export const getRubrics = async (req, res, next) => {
  try {
    res.json(await RubricService.findAll(currentUserId(req)));
  } catch (error) {
    next(error);
  }
};

export const getRubricById = async (req, res, next) => {
  try {
    res.json(await RubricService.findById(req.params.id, currentUserId(req)));
  } catch (error) {
    next(error);
  }
};

export const createRubric = async (req, res, next) => {
  try {
    const value = await createRubricValidator.validateAsync(req.body, {
      abortEarly: false,
    });
    const rubric = await RubricService.create(value, currentUserId(req));
    res.status(201).json(rubric);
  } catch (error) {
    next(error);
  }
};

export const updateRubric = async (req, res, next) => {
  try {
    const value = await updateRubricValidator.validateAsync(req.body, {
      abortEarly: false,
    });
    res.json(await RubricService.update(req.params.id, value, currentUserId(req)));
  } catch (error) {
    next(error);
  }
};

export const deleteRubric = async (req, res, next) => {
  try {
    await RubricService.delete(req.params.id, currentUserId(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
