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

  async existsByLeiaId(leiaId) {
    return await ExperimentRepository.existsByLeiaId(leiaId);
  }

  async findByLeiaId(leiaId) {
    return await ExperimentRepository.findByLeiaId(leiaId);
  }

  async findByUserId(userId, visibility = 'all', populated = false) {
    return await ExperimentRepository.findByUserId(userId, visibility, populated);
  }

  async checkEditable(experimentId, userId) {
    const experiment = await ExperimentRepository.findById(experimentId);
    if (!experiment) {
      const error = new Error('Experiment not found');
      error.statusCode = 404;
      throw error;
    }
    if (!experiment.user.equals(userId)) {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }
    if (experiment.isPublished) {
      const error = new Error('Experiment is published');
      error.statusCode = 409;
      throw error;
    }
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

  async deleteById(id) {
    return await ExperimentRepository.deleteById(id);
  }
}

export default new ExperimentService();
