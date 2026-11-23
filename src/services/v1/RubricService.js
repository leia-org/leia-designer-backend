import RubricRepository from '../../repositories/v1/RubricRepository.js';
import LeiaRepository from '../../repositories/v1/LeiaRepository.js';
import { canAccess, createUnauthorizedError } from '../../utils/entity.js';
import { populateUserInEntity } from '../../utils/authClient.js';

const notFound = () => {
  const error = new Error('Rubric not found');
  error.statusCode = 404;
  return error;
};

const isOwnerOrPrivileged = (rubric, context = {}) => {
  if (context.role === 'admin' || context.internal) return true;
  if (!context.userId || !rubric?.user) return false;
  if (typeof rubric.user.equals === 'function') {
    return rubric.user.equals(context.userId);
  }
  const ownerId = rubric.user._id ? rubric.user._id.toString() : rubric.user.toString();
  return ownerId === String(context.userId);
};

class RubricService {
  async findByQuery(text, visibility = 'all', context = {}) {
    const rubrics = await RubricRepository.findByQuery(
      text,
      context.userId,
      visibility,
      Boolean(context.role === 'admin' || context.internal),
    );
    return await populateUserInEntity(rubrics);
  }

  async findById(id, context = {}) {
    const rubric = await RubricRepository.findById(id);
    if (!canAccess(rubric, context)) {
      throw createUnauthorizedError('Rubric');
    }
    return rubric;
  }

  async findByIdPopulatedUser(id, context = {}) {
    const rubric = await this.findById(id, context);
    return await populateUserInEntity(rubric);
  }

  async create(rubricData, context = {}, publish = true) {
    const payload = {
      ...rubricData,
      user: context.userId,
      isPublished: context.role === 'admin' ? Boolean(publish) : false,
    };
    return await RubricRepository.create(payload);
  }

  async update(id, rubricData, context = {}) {
    const existing = await RubricRepository.findById(id);
    if (!existing) throw notFound();
    if (!isOwnerOrPrivileged(existing, context)) {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }

    const sanitized = { ...rubricData };
    delete sanitized.user;
    delete sanitized.userId;
    delete sanitized.isPublished;

    const rubric = await RubricRepository.updateById(id, sanitized);
    if (!rubric) throw notFound();
    return rubric;
  }

  async publish(id, context = {}) {
    const rubric = await RubricRepository.findById(id);
    if (!rubric) throw notFound();

    if (context.role !== 'admin' && !context.internal) {
      const error = new Error('Unauthorized, only admin can publish a rubric');
      error.statusCode = 403;
      throw error;
    }

    if (rubric.isPublished) {
      return rubric;
    }

    rubric.isPublished = true;
    return await rubric.save();
  }

  async unpublish(id, context = {}) {
    const rubric = await RubricRepository.findById(id);
    if (!rubric) throw notFound();

    if (context.role !== 'admin' && !context.internal) {
      const error = new Error('Unauthorized, only admin can unpublish a rubric');
      error.statusCode = 403;
      throw error;
    }

    if (!rubric.isPublished) {
      return rubric;
    }

    rubric.isPublished = false;
    return await rubric.save();
  }

  async delete(id, context = {}) {
    const rubric = await RubricRepository.findById(id);
    if (!rubric) throw notFound();

    if (!isOwnerOrPrivileged(rubric, context)) {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }

    const inUse = await LeiaRepository.findByRubricId(id);
    if (inUse.length > 0) {
      const error = new Error('Cannot delete rubric in use');
      error.statusCode = 400;
      error.data = inUse.map((leia) => ({ id: leia._id, name: leia.metadata.name }));
      throw error;
    }
    const deleted = await RubricRepository.deleteById(id);
    if (!deleted) throw notFound();
    return deleted;
  }
}

export default new RubricService();
