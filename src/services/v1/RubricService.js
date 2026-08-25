import RubricRepository from '../../repositories/v1/RubricRepository.js';
import LeiaRepository from '../../repositories/v1/LeiaRepository.js';

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
    const ownedRubric = await RubricRepository.findOwnedById(id, userId);
    if (!ownedRubric) throw notFound();

    const inUse = await LeiaRepository.findByRubricId(id);
    if (inUse.length > 0) {
      const error = new Error('Cannot delete rubric in use');
      error.statusCode = 400;
      error.data = inUse.map((leia) => ({ id: leia._id, name: leia.metadata.name }));
      throw error;
    }
    const rubric = await RubricRepository.deleteOwnedById(id, userId);
    if (!rubric) throw notFound();
    return rubric;
  }
}

export default new RubricService();
