import axios from 'axios';
import { v4 } from 'uuid';
import ProviderService from './ProviderService.js';

class RunnerService {
  async initializeRunner(leia, runnerConfiguration = null) {
    const sessionId = v4();
    const normalizedRunnerConfiguration =
      runnerConfiguration && Object.keys(runnerConfiguration).length > 0
        ? runnerConfiguration
        : {
            provider: 'default',
          };
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

  async sendMessage(sessionId, message) {
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/leias/${sessionId}/messages`,
      {
        message,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data.message;
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
