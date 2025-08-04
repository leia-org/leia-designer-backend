import RunnerService from "../../services/v1/RunnerService.js";
import { runnerLeiaValidator } from "../../validators/v1/leiaValidator.js";

export const initializeRunner = async (req, res, next) => {
  try {
    const value = await runnerLeiaValidator.validateAsync(req.body, { abortEarly: false });
    const sessionId = await RunnerService.initializeRunner(value);
    res.json({ sessionId });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = req.body.message;
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      const error = new Error('Session ID is required');
      error.statusCode = 400;
      throw error;
    }
    if (!message) {
      const error = new Error('Message is required');
      error.statusCode = 400;
      throw error;
    }
    const response = await RunnerService.sendMessage(sessionId, message);
    res.json({ message: response });
  } catch (err) {
    next(err);
  }
};
