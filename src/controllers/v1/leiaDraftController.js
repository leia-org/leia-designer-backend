import LeiaDraftService from '../../services/v1/LeiaDraftService.js';
import {
  createLeiaDraftValidator,
  updateLeiaDraftValidator,
} from '../../validators/v1/leiaDraftValidator.js';

const userIdFrom = (req) => req.auth?.payload?.id;

export const getLeiaDrafts = async (req, res, next) => {
  try {
    const drafts = await LeiaDraftService.findByUser(userIdFrom(req));
    res.json(drafts);
  } catch (error) {
    next(error);
  }
};

export const createLeiaDraft = async (req, res, next) => {
  try {
    const data = await createLeiaDraftValidator.validateAsync(req.body, {
      abortEarly: false,
    });
    const draft = await LeiaDraftService.create(data, userIdFrom(req));
    res.status(201).json(draft);
  } catch (error) {
    next(error);
  }
};

export const updateLeiaDraft = async (req, res, next) => {
  try {
    const data = await updateLeiaDraftValidator.validateAsync(req.body, {
      abortEarly: false,
    });
    const draft = await LeiaDraftService.update(req.params.id, data, userIdFrom(req));
    res.json(draft);
  } catch (error) {
    next(error);
  }
};

export const deleteLeiaDraft = async (req, res, next) => {
  try {
    await LeiaDraftService.delete(req.params.id, userIdFrom(req));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
