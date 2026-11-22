import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/repositories/v1/RubricRepository.js', () => ({
  default: {
    findByQuery: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    deleteById: vi.fn(),
  },
}));

vi.mock('../src/repositories/v1/LeiaRepository.js', () => ({
  default: {
    findByRubricId: vi.fn(),
  },
}));

vi.mock('../src/utils/authClient.js', () => ({
  populateUserInEntity: vi.fn(async (entity) => entity),
}));

import RubricRepository from '../src/repositories/v1/RubricRepository.js';
import LeiaRepository from '../src/repositories/v1/LeiaRepository.js';
import RubricService from '../src/services/v1/RubricService.js';

describe('RubricService visibility and ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  test('passes visibility and privileges when querying rubrics', async () => {
    RubricRepository.findByQuery.mockResolvedValue([]);

    await RubricService.findByQuery('interview', 'public', { userId: 'user-1', role: 'instructor' });
    await RubricService.findByQuery(undefined, 'all', { userId: 'admin-1', role: 'admin' });

    expect(RubricRepository.findByQuery).toHaveBeenNthCalledWith(1, 'interview', 'user-1', 'public', false);
    expect(RubricRepository.findByQuery).toHaveBeenNthCalledWith(2, undefined, 'admin-1', 'all', true);
  });

  test('allows access to published rubrics by any user and denies private rubrics owned by others', async () => {
    RubricRepository.findById.mockResolvedValueOnce({
      _id: 'rubric-public',
      user: 'user-owner',
      isPublished: true,
    });
    const publicRubric = await RubricService.findById('rubric-public', { userId: 'user-other', role: 'instructor' });
    expect(publicRubric._id).toBe('rubric-public');

    RubricRepository.findById.mockResolvedValueOnce({
      _id: 'rubric-private',
      user: 'user-owner',
      isPublished: false,
    });
    await expect(
      RubricService.findById('rubric-private', { userId: 'user-other', role: 'instructor' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('never accepts owner from payload and only lets admins publish on create', async () => {
    RubricRepository.create.mockResolvedValue({ _id: 'rubric-1' });

    await RubricService.create(
      {
        apiVersion: 'v1',
        metadata: { name: 'A' },
        spec: { sections: [] },
        user: 'other-user',
      },
      { userId: 'user-1', role: 'instructor' },
      true,
    );

    expect(RubricRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: 'user-1', isPublished: false }),
    );

    await RubricService.create(
      {
        apiVersion: 'v1',
        metadata: { name: 'B' },
        spec: { sections: [] },
      },
      { userId: 'admin-1', role: 'admin' },
      true,
    );

    expect(RubricRepository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ user: 'admin-1', isPublished: true }),
    );
  });

  test('forbids updating a rubric owned by another user unless admin', async () => {
    RubricRepository.findById.mockResolvedValue({ _id: 'rubric-1', user: 'user-1', isPublished: true });

    await expect(
      RubricService.update(
        'rubric-1',
        { apiVersion: 'v1', metadata: { name: 'A' }, spec: { sections: [] } },
        { userId: 'user-2', role: 'instructor' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('prevents deleting a rubric referenced by a LEIA and enforces owner/admin permissions', async () => {
    RubricRepository.findById.mockResolvedValueOnce({ _id: 'rubric-1', user: 'user-1', isPublished: false });
    await expect(
      RubricService.delete('rubric-1', { userId: 'user-2', role: 'instructor' }),
    ).rejects.toMatchObject({ statusCode: 403 });

    RubricRepository.findById.mockResolvedValueOnce({ _id: 'rubric-1', user: 'user-1', isPublished: false });
    LeiaRepository.findByRubricId.mockResolvedValue([
      { _id: 'leia-1', metadata: { name: 'Interview practice' } },
    ]);

    await expect(
      RubricService.delete('rubric-1', { userId: 'user-1', role: 'instructor' }),
    ).rejects.toMatchObject({
      message: 'Cannot delete rubric in use',
      statusCode: 400,
      data: [{ id: 'leia-1', name: 'Interview practice' }],
    });
    expect(RubricRepository.deleteById).not.toHaveBeenCalled();
  });
});
