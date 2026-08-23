import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';
import { populateUserInEntity } from '../../utils/authClient.js';
class ExperimentService {

  // READ METHODS

  async findAll() {
    const experiments = await ExperimentRepository.findAll();
    return await populateUserInEntity(experiments);
  }

  async findById(id) {
    const experiment = await ExperimentRepository.findById(id);
    return await populateUserInEntity(experiment);
  }

  async findByIdPopulated(id) {
    const experiment = await ExperimentRepository.findByIdPopulated(id);
    return await populateUserInEntity(experiment);
  }

  async existsByLeiaId(leiaId) {
    return await ExperimentRepository.existsByLeiaId(leiaId);
  }

  async findByLeiaId(leiaId) {
    const experiment = await ExperimentRepository.findByLeiaId(leiaId);
    return await populateUserInEntity(experiment);
  }

  async findByUserId(userId, visibility = 'all', populated = false) {
    const experiments = await ExperimentRepository.findByUserId(userId, visibility, populated);
    return await populateUserInEntity(experiments);
  }

  async checkEditable(experimentId, userId) {
    const experiment = await this.findById(experimentId);
    if (!experiment) {
      const error = new Error('Experiment not found');
      error.statusCode = 404;
      throw error;
    }
    if (experiment.user.id !== userId) {
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
  async checkNameExists(name) {
    return await ExperimentRepository.existsByName(name);
  }
  // WRITE METHODS

  async create(experimentData) {
    return await ExperimentRepository.create(experimentData);
  }

  async updateName(id, name) {
    return await ExperimentRepository.update(id, { name });
  }

  //fix to add check for leia before publishing modeled after checkEditable
  async publish(id) {
    const experiment = await this.findByIdPopulated(id);
    if (!experiment.leias || experiment.leias.length === 0) {
      const error = new Error('Experiment must have an associated LEIA before publishing');
      error.statusCode = 400;
      throw error;
    }
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
