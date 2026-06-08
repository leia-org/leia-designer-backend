import RunnerService from "../../services/v1/RunnerService.js";
import { runnerLeiaValidator } from "../../validators/v1/leiaValidator.js";

export const initializeRunner = async (req, res, next) => {
  try {
    const value = await runnerLeiaValidator.validateAsync(req.body, { abortEarly: false });
    if (!value.runnerConfiguration) {
      const error = new Error('runnerConfiguration is required for testing');
      error.statusCode = 400;
      throw error;
    }
    const runnerConfiguration = value.runnerConfiguration
      ? { ...value.runnerConfiguration }
      : null;

    if (runnerConfiguration?.apiKeyId) {
      const requesterId = req.auth?.payload?.id;
      if (!requesterId) {
        const error = new Error('User ID is required for API key usage');
        error.statusCode = 400;
        throw error;
      }
      runnerConfiguration.apiKeyRequesterId = requesterId;
    }

    if (runnerConfiguration?.modelName) {
      const providerDriver = await RunnerService.resolveProviderDriver(
        runnerConfiguration.modelName
      );
      if (!providerDriver) {
        const error = new Error('Invalid model name');
        error.statusCode = 400;
        throw error;
      }
      runnerConfiguration.provider = providerDriver;
    }

    const sessionId = await RunnerService.initializeRunner(
      { spec: value.spec },
      runnerConfiguration
    );
    res.json({ sessionId });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { message, tools, toolResults } = req.body;
    const sessionId = req.params.sessionId;
    if (!sessionId) {
      const error = new Error('Session ID is required');
      error.statusCode = 400;
      throw error;
    }
    const hasToolResults = Array.isArray(toolResults) && toolResults.length > 0;
    if (!message && !hasToolResults) {
      const error = new Error('Message is required');
      error.statusCode = 400;
      throw error;
    }
    const response = await RunnerService.sendMessage(sessionId, message, { tools, toolResults });
    // Forward the full runner shape: { message } or { toolCalls }.
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const generateTranscription = async (req, res, next) => {
  try {
    const value = await runnerLeiaValidator.validateAsync(req.body, { abortEarly: false });
    const transcription = await RunnerService.generateTranscription(value);
    res.json(transcription);
  } catch (err) {
    next(err);
  }
};

export const generateProblem = async (req, res, next) => {
  try {
    const { subject, additionalDetails, exampleProblem } = req.body;
    const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';

    if (!normalizedSubject) {
      const error = new Error('Subject is required');
      error.statusCode = 400;
      throw error;
    }
    if (!exampleProblem || typeof exampleProblem !== 'object') {
      const error = new Error('Example problem is required');
      error.statusCode = 400;
      throw error;
    }
    const generatedProblem = await RunnerService.generateProblem(
      normalizedSubject,
      additionalDetails,
      exampleProblem
    );
    res.json(generatedProblem);
  } catch (err) {
    next(err);
  }
};

export const generateBehaviour = async (req, res, next) => {
  try {
    const { subject, additionalDetails, exampleBehaviour } = req.body;
    const normalizedSubject = typeof subject === 'string' ? subject.trim() : '';
    if (!normalizedSubject) {
      const error = new Error('Subject is required');
      error.statusCode = 400;
      throw error;
    }
    if (!exampleBehaviour || typeof exampleBehaviour !== 'object') {
      const error = new Error('Example behaviour is required');
      error.statusCode = 400;
      throw error;
    }
    const generatedBehaviour = await RunnerService.generateBehaviour(
      normalizedSubject,
      additionalDetails,
      exampleBehaviour
    );
    res.json(generatedBehaviour);
  } catch (err) {
    next(err);
  }
};

export const evaluate = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const { result } = req.body;
    if (!sessionId) {
      const error = new Error('Session ID is required');
      error.statusCode = 400;
      throw error;
    }
    if (!result) {
      const error = new Error('Result is required');
      error.statusCode = 400;
      throw error;
    }
    const evaluation = await RunnerService.getEvaluationAndScore(sessionId, result);
    res.json(evaluation);
  } catch (err) {
    next(err);
  }
};

// --- Problem-chat (design-time assistant) ---

export const openProblemChat = async (req, res, next) => {
  try {
    const { modelName, apiKeyId } = req.body || {};
    const requesterId = req.auth?.payload?.id;
    if (!modelName || !apiKeyId) {
      const error = new Error('modelName and apiKeyId are required');
      error.statusCode = 400;
      throw error;
    }
    if (!requesterId) {
      const error = new Error('User ID is required for API key usage');
      error.statusCode = 400;
      throw error;
    }
    const result = await RunnerService.openProblemChat({ modelName, apiKeyId, apiKeyRequesterId: requesterId });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const uploadProblemChatFile = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!req.file) {
      const error = new Error('A PDF file is required (multipart field "file")');
      error.statusCode = 400;
      throw error;
    }
    const result = await RunnerService.uploadProblemChatFile(chatId, req.file.buffer, req.file.originalname);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const sendProblemChatMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { message, tools, toolResults, fileIds } = req.body;
    const result = await RunnerService.sendProblemChatMessage(chatId, { message, tools, toolResults, fileIds });
    res.json(result);
  } catch (err) {
    next(err);
  }
};
