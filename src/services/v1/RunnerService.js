import axios from 'axios';
import { v4 } from 'uuid';

class RunnerService {
  async initializeRunner(leia, runnerConfiguration = null) {
    const sessionId = v4();
    // When the activity declares widgets/tools, the designer "try" must run
    // text mode through the openai-responses provider so the runner enables
    // function tools (its gate requires that provider). Otherwise keep the
    // default provider.
    const hasWidgets =
      Array.isArray(leia?.spec?.problem?.spec?.widgets) &&
      leia.spec.problem.spec.widgets.length > 0;
    const effectiveConfiguration = runnerConfiguration
      ? runnerConfiguration
      : { provider: hasWidgets ? 'openai-responses' : 'default' };
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1/leias`,
      {
        sessionId,
        leia: leia,
        runnerConfiguration: effectiveConfiguration,
      },
      {
        headers: {
          Authorization: 'Bearer ' + process.env.RUNNER_KEY,
        },
      }
    );
    return response.data.sessionId;
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
