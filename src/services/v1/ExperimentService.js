import ExperimentRepository from '../../repositories/v1/ExperimentRepository.js';
import LeiaRepository from '../../repositories/v1/LeiaRepository.js';
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
  async checkLeiaCompability(experimentId, leiaId) {
    const experiment = await ExperimentRepository.findByIdPopulated(experimentId);
    if (experiment.isMultiLeia) {
    const leiaNew = await LeiaRepository.findById(leiaId);
    if (!experiment) {
      const error = new Error('Activity not found');
      error.statusCode = 404;
      throw error;
    }
    for (const leiaConfig of experiment.leias) {
      const leiaOld = await LeiaRepository.findById(leiaConfig.leia);
      if (!leiaOld) {
        const error = new Error('Previous LEIA not found in experiment');
        error.statusCode = 404;
        throw error;
      }
      if (leiaOld.spec.problemId.toString() !== leiaNew.spec.problemId.toString()) {
        const error = new Error('Selected LEIA is not compatible with this activity');
        error.statusCode = 400;
        throw error;
      }
      if (leiaOld.id.toString() === leiaNew.id.toString()) {
        const error = new Error('Selected LEIA is already in this activity');
        error.statusCode = 400;
        throw error;
      }
    }
  }
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
    const experiment = await ExperimentRepository.findByIdPopulated(id);
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
