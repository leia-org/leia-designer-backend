import RubricRepository from '../../repositories/v1/RubricRepository.js';

const notFound = () => {
  const error = new Error('Rubric not found');
  error.statusCode = 404;
  return error;
};

class RubricService {
  async findAll(userId) {
    return await RubricRepository.findByOwner(userId);
  }

  async findById(id, userId) {
    const rubric = await RubricRepository.findOwnedById(id, userId);
    if (!rubric) throw notFound();
    return rubric;
  }

  async create(rubricData, userId) {
    return await RubricRepository.create({ ...rubricData, user: userId });
  }

  async update(id, rubricData, userId) {
    const rubric = await RubricRepository.updateOwnedById(id, userId, rubricData);
    if (!rubric) throw notFound();
    return rubric;
  }

  async delete(id, userId) {
    const rubric = await RubricRepository.deleteOwnedById(id, userId);
    if (!rubric) throw notFound();
    return rubric;
  }
}

export default new RubricService();
