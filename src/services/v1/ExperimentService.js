import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';

class ExperimentService {
  // READ METHODS

  async findAll() {
    return await ExperimentRepository.findAll();
  }

  async findById(id) {
    return await ExperimentRepository.findById(id);
  }

  async findByIdPopulated(id) {
    return await ExperimentRepository.findByIdPopulated(id);
  }

  async findByUserId(userId, visibility = 'all') {
    return await ExperimentRepository.findByUserId(userId, visibility);
  }

  // WRITE METHODS

  async create(experimentData) {
    return await ExperimentRepository.create(experimentData);
  }

  async updateName(id, name) {
    return await ExperimentRepository.update(id, { name });
  }

  async publish(id) {
    return await ExperimentRepository.update(id, { isPublished: true });
  }

  async addLeia(experimentId, leiaConfig) {
    return await ExperimentRepository.addLeia(experimentId, leiaConfig);
  }

  async updateLeia(experimentId, leiaConfigId, leiaConfig) {
    return await ExperimentRepository.updateLeia(experimentId, leiaConfigId, leiaConfig);
  }

  // DELETE METHODS

  async deleteLeia(experimentId, leiaConfigId) {
    return await ExperimentRepository.deleteLeia(experimentId, leiaConfigId);
  }
}

export default new ExperimentService();
