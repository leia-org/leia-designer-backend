import LeiaDraftRepository from '../../repositories/v1/LeiaDraftRepository.js';

const ensureOwner = (draft, userId) => {
  if (!draft) {
    const error = new Error('LEIA draft not found');
    error.statusCode = 404;
    throw error;
  }

  if (draft.user?.toString() !== userId) {
    const error = new Error('Unauthorized: You can only access your own LEIA drafts');
    error.statusCode = 403;
    throw error;
  }
};

class LeiaDraftService {
  async findByUser(userId) {
    return await LeiaDraftRepository.findByUser(userId);
  }

  async create(data, userId) {
    return await LeiaDraftRepository.create({ ...data, user: userId });
  }

  async update(id, data, userId) {
    const draft = await LeiaDraftRepository.findById(id);
    ensureOwner(draft, userId);
    return await LeiaDraftRepository.update(id, data);
  }

  async delete(id, userId) {
    const draft = await LeiaDraftRepository.findById(id);
    ensureOwner(draft, userId);
    return await LeiaDraftRepository.delete(id);
  }
}

export default new LeiaDraftService();
