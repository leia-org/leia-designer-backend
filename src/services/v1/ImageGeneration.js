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

  async generatePersonaAvatar(persona) {
    return await this.post('/avatars/personas/generate', { persona });
  }

  async generateProblemAvatar(problem) {
    return await this.post('/avatars/problems/generate', { problem });
  }

  async generateLeiaAvatar(leia) {
    return await this.post('/avatars/leias/generate', { leia });
  }

  async generateInfographic(behaviour) {
    return await this.post('/infographics/generate', { behaviour });
  }
}
export default new ImageGeneration();
