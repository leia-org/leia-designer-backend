import Session from '../../models/Session.js';

class SessionRepository {
  // READ METHODS

  async findAll() {
    return await Session.find();
  }

  async findById(id) {
    return await Session.findById(id);
  }

  async findByUser(userId) {
    return await Session.find({ user: userId });
  }

  async findByExperiment(experimentId) {
    return await Session.find({ experiment: experimentId });
  }

  // WRITE METHODS

  async create(sessionData) {
    const session = new Session(sessionData);
    return await session.save();
  }

  async update(id, sessionData) {
    return await Session.findByIdAndUpdate(id, sessionData, { new: true });
  }

  async addMessage(sessionId, messageId) {
    return await Session.findByIdAndUpdate(sessionId, { $push: { messages: messageId } });
  }

  async finishSession(sessionId) {
    return await Session.findByIdAndUpdate(sessionId, { finishedAt: Date.now() });
  }
}

export default new SessionRepository();
