import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';

class ExperimentService {
  // READ METHODS

  async findAll() {
    return await ExperimentRepository.findAll();
  }

  async findById(id) {
    return await ExperimentRepository.findById(id);
  }

  // WRITE METHODS

  async create(experimentData) {
    return await ExperimentRepository.create(experimentData);
  }

  async updateName(id, name) {
    return await ExperimentRepository.update(id, { name });
  }

  async regenerateCode(id) {
    return await ExperimentRepository.regenerateCode(id);
  }

  async toggleIsActive(id) {
    return await ExperimentRepository.toggleIsActive(id);
  }

  async updateDuration(id, duration) {
    return await ExperimentRepository.update(id, { duration });
  }

  async addLeia(experimentId, leiaConfig) {
    return await ExperimentRepository.addLeia(experimentId, leiaConfig);
  }

  async updateLeia(experimentId, leiaConfigId, leiaConfig) {
    return await ExperimentRepository.updateLeia(experimentId, leiaConfigId, leiaConfig);
  }

  async deleteLeia(experimentId, leiaConfigId) {
    return await ExperimentRepository.deleteLeia(experimentId, leiaConfigId);
  }
}

export default new ExperimentService();
