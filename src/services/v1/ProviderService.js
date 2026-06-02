import axios from 'axios';

class ProviderService {
  async getAllModelsAndDetails() {
    const response = await axios.get(`${process.env.RUNNER_URL}/api/v1/models`, {
      headers: {
        Authorization: 'Bearer ' + process.env.RUNNER_KEY,
      },
    });
    return response.data;
  }
}

export default new ProviderService();
