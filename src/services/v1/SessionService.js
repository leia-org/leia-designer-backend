import SessionRepository from '../../repositories/v1/SessionRepository.js';

class SessionService {
  // READ METHODS

  async findAll() {
    return await SessionRepository.findAll();
  }

  async findById(id) {
    return await SessionRepository.findById(id);
  }

  async findByUser(userId) {
    return await SessionRepository.findByUser(userId);
  }

  async findByExperiment(experimentId) {
    return await SessionRepository.findByExperiment(experimentId);
  }

  // WRITE METHODS

  async create(sessionData) {
    return await SessionRepository.create(sessionData);
  }

  async addMessage(sessionId, messageId) {
    return await SessionRepository.addMessage(sessionId, messageId);
  }

  async updateResult(sessionId, result) {
    return await SessionRepository.update(sessionId, { result });
  }

  async updateEvaluation(sessionId, evaluation) {
    return await SessionRepository.update(sessionId, { evaluation });
  }

  async finishSession(sessionId) {
    return await SessionRepository.finishSession(sessionId);
  }
}

export default new SessionService();
