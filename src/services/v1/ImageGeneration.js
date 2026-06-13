import axios from 'axios';

class ImageGeneration {
  async post(path, body) {
    const response = await axios.post(
      `${process.env.RUNNER_URL}/api/v1${path}`,
      body,
      { headers: { Authorization: 'Bearer ' + process.env.RUNNER_KEY } }
    );
    return response.data;
  }

  async generatePersonaAvatar(persona, apiKeyConfig) {
    return await this.post('/avatars/personas/generate', { persona, ...apiKeyConfig });
  }

  async generateProblemAvatar(problem, apiKeyConfig) {
    return await this.post('/avatars/problems/generate', { problem, ...apiKeyConfig });
  }

  async generateLeiaAvatar(leia, apiKeyConfig) {
    return await this.post('/avatars/leias/generate', { leia, ...apiKeyConfig });
  }

  async generateInfographic(leia, solution = false, apiKeyConfig) {
    return await this.post('/infographics/generate', { leia, solution, ...apiKeyConfig });
  }
}
export default new ImageGeneration();
