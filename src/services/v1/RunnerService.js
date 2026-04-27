import axios from 'axios';
import { v4 } from 'uuid';

class RunnerService {
  async initializeRunner(leia, runnerConfiguration = null) {
    const sessionId = v4();
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/leias`,
      {
        sessionId,
        leia: leia,
        runnerConfiguration: runnerConfiguration ? runnerConfiguration : {
          provider: 'default',
        }
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data.sessionId;
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

  async getAllModelsAndDetails() {
    const response = await axios.get(`${process.env.RUNNER_URL}/api/v1/models`, {
      headers: {
        Authorization: 'Bearer ' + process.env.RUNNER_KEY,
      },
    });
    console.log('Available models from Runner:', response.data);
    return response.data;
  }
}

export default new RunnerService();