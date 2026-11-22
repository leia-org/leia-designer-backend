import RubricService from '../services/v1/RubricService.js';
import { createRubricValidator, updateRubricValidator } from '../validators/v1/rubricValidator.js';
import { validateBoolean, validateVisibility } from '../validators/queryValidator.js';
import rubricDefinitionSchema from '../schemas/v1/rubricSchema.js';

const buildContext = (req) => ({
  userId: req.auth?.payload?.id,
  role: req.auth?.payload?.role,
});

export const getRubricSchema = (_req, res) => res.type('application/schema+json').json(rubricDefinitionSchema);

export const getRubrics = async (req, res, next) => {
  try {
    const { text } = req.query;
    const rubrics = await RubricService.findByQuery(
      text,
      validateVisibility(req.query.visibility),
      buildContext(req),
    );
    res.json(rubrics);
  } catch (error) {
    next(error);
  }
};

export const getRubricById = async (req, res, next) => {
  try {
    res.json(await RubricService.findByIdPopulatedUser(req.params.id, buildContext(req)));
  } catch (error) {
    next(error);
  }
};

export const createRubric = async (req, res, next) => {
  try {
    const value = await createRubricValidator.validateAsync(req.body, {
      abortEarly: false,
    });
    const rubric = await RubricService.create(
      value,
      buildContext(req),
      validateBoolean(req.query.publish, true),
    );
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
    res.json(await RubricService.update(req.params.id, value, buildContext(req)));
  } catch (error) {
    next(error);
  }
};

export const deleteRubric = async (req, res, next) => {
  try {
    await RubricService.delete(req.params.id, buildContext(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
