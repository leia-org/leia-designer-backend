import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';
import { getUserProfileFromAuthService } from '../../utils/authClient.js';
class ExperimentService {

  async _populateUser(experiment) {
    if (!experiment) return null;
    const expObj = experiment.toJSON ? experiment.toJSON() : experiment;
    if (expObj.user) {
      const userProfile = await getUserProfileFromAuthService(expObj.user);
      if (userProfile) {
        expObj.user = userProfile;
      }
    }
    return expObj;
  }

  async _populateUsers(experiments) {
    if (!experiments || experiments.length === 0) return [];
    return await Promise.all(experiments.map(exp => this._populateUser(exp)));
  }
  // READ METHODS

  async findAll() {
    const experiments = await ExperimentRepository.findAll();
    return await this._populateUsers(experiments);
  }

  async findById(id) {
    const experiment = await ExperimentRepository.findById(id);
    return await this._populateUser(experiment);
  }

  async findByIdPopulated(id) {
    const experiment = await ExperimentRepository.findByIdPopulated(id);
    return await this._populateUser(experiment);
  }

  async existsByLeiaId(leiaId) {
    return await ExperimentRepository.existsByLeiaId(leiaId);
  }

  async findByLeiaId(leiaId) {
    const experiment = await ExperimentRepository.findByLeiaId(leiaId);
    return await this._populateUser(experiment);
  }

  async findByUserId(userId, visibility = 'all', populated = false) {
    const experiments = await ExperimentRepository.findByUserId(userId, visibility, populated);
    return await this._populateUsers(experiments);
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
