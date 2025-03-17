import MessageRepository from '../../repositories/v1/MessageRepository.js';

class MessageService {
  // READ METHODS

  async findAll() {
    return await MessageRepository.findAll();
  }

  async findById(id) {
    return await MessageRepository.findById(id);
  }

  async findBySession(sessionId) {
    return await MessageRepository.findBySession(sessionId);
  }

  // WRITE METHODS

  async create(messageData) {
    return await MessageRepository.create(messageData);
  }
}

export default new MessageService();
