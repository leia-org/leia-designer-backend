import Message from '../../models/Message.js';

class MessageRepository {
  // READ METHODS

  async findAll() {
    return await Message.find();
  }

  async findById(id) {
    return await Message.findById(id);
  }

  async findBySession(sessionId) {
    return await Message.find({ session: sessionId });
  }

  // WRITE METHODS

  async create(messageData) {
    const message = new Message(messageData);
    return await message.save();
  }
}

export default new MessageRepository();
