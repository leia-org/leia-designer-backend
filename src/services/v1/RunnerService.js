import axios from 'axios';
import { v4 } from 'uuid';
import FormData from 'form-data';
import ProviderService from './ProviderService.js';

class RunnerService {
  // --- Problem-chat: design-time assistant (attach PDFs, chat, FE tools) ---
  async openProblemChat(runnerConfiguration) {
    const { data } = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/problems/chat/session`,
      { runnerConfiguration },
      { headers: { Authorization: 'Bearer ' + process.env.RUNNER_KEY } }
    );
    return data;
  }

  async uploadProblemChatFile(chatId, buffer, filename) {
    const form = new FormData();
    form.append('file', buffer, { filename: filename || 'document.pdf', contentType: 'application/pdf' });
    const { data } = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/problems/chat/${chatId}/files`,
      form,
      {
        headers: { ...form.getHeaders(), Authorization: 'Bearer ' + process.env.RUNNER_KEY },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
    return data;
  }

  async sendProblemChatMessage(chatId, body) {
    const { data } = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/problems/chat/${chatId}/messages`,
      body,
      { headers: { Authorization: 'Bearer ' + process.env.RUNNER_KEY } }
    );
    return data;
  }

  async initializeRunner(leia, runnerConfiguration = null) {
    const sessionId = v4();
    // When the activity declares widgets/tools, the designer "try" runs text
    // mode through the openai-responses provider so the runner enables function
    // tools (its gate requires that provider). A provided runnerConfiguration
    // (BYOK model/apikey selection) always wins.
    const hasWidgets =
      Array.isArray(leia?.spec?.problem?.spec?.widgets) &&
      leia.spec.problem.spec.widgets.length > 0;
    const normalizedRunnerConfiguration =
      runnerConfiguration && Object.keys(runnerConfiguration).length > 0
        ? runnerConfiguration
        : { provider: hasWidgets ? 'openai-responses' : 'default' };
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/leias`,
      {
        sessionId,
        leia: leia,
        runnerConfiguration: normalizedRunnerConfiguration,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data.sessionId;
  }

  async resolveProviderDriver(modelName) {
    const data = await ProviderService.getAllModelsAndDetails();
    const provider = Object.entries(data.apiKeyProviders || {})
      .find(([, models]) => models.includes(modelName))?.[0];

    if (!provider) return null;
    return data.providerProviderModuleMap?.[provider] || null;
  }

  async sendMessage(sessionId, message, options = {}) {
    const body = {};
    if (typeof message === 'string' && message.length > 0) body.message = message;
    if (Array.isArray(options.tools) && options.tools.length > 0) body.tools = options.tools;
    if (Array.isArray(options.toolResults) && options.toolResults.length > 0) body.toolResults = options.toolResults;

    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/leias/${sessionId}/messages`,
      body,
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    // Forward the full runner response so the caller can branch on
    // toolCalls vs. final text.
    return response.data;
  }

  async generateTranscription(leia) {
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/transcriptions/generate`,
      {
        leia,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data.messages;
  }

  async generateProblem(subject, additionalDetails, exampleProblem) {
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/problems/generate`,
      {
        subject,
        additionalDetails,
        exampleProblem,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data;
  }

  async generateBehaviour(subject, additionalDetails, exampleBehaviour) {
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/behaviours/generate`,
      {
        subject,
        additionalDetails,
        exampleBehaviour,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data;
  }

  async getEvaluationAndScore(sessionId, result) {
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/evaluation`,
      {
        sessionId,
        result,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    const { evaluation, score } = response.data;
    return { evaluation, score };
  }
}

export default new RunnerService();
