import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/repositories/v1/RubricRepository.js', () => ({
  default: {
    findByOwner: vi.fn(),
    findOwnedById: vi.fn(),
    create: vi.fn(),
    updateOwnedById: vi.fn(),
    deleteOwnedById: vi.fn(),
  },
}));

vi.mock('../src/repositories/v1/LeiaRepository.js', () => ({
  default: {
    findByRubricId: vi.fn(),
  },
}));

import RubricRepository from '../src/repositories/v1/RubricRepository.js';
import LeiaRepository from '../src/repositories/v1/LeiaRepository.js';
import RubricService from '../src/services/v1/RubricService.js';

describe('RubricService ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  test('scopes listing and lookup to the current user', async () => {
    RubricRepository.findByOwner.mockResolvedValue([]);
    RubricRepository.findOwnedById.mockResolvedValue({ _id: 'rubric-1' });

    await RubricService.findAll('user-1');
    await RubricService.findById('rubric-1', 'user-1');

    expect(RubricRepository.findByOwner).toHaveBeenCalledWith('user-1');
    expect(RubricRepository.findOwnedById).toHaveBeenCalledWith('rubric-1', 'user-1');
  });

  test('never accepts an owner from the submitted payload', async () => {
    RubricRepository.create.mockResolvedValue({ _id: 'rubric-1' });

    await RubricService.create({
      apiVersion: 'v1',
      metadata: { name: 'A' },
      spec: { markdown: '| A | B |' },
      user: 'other-user',
    }, 'user-1');

    expect(RubricRepository.create).toHaveBeenCalledWith(expect.objectContaining({ user: 'user-1' }));
  });

  test('returns not found when an owned update matches no rubric', async () => {
    RubricRepository.updateOwnedById.mockResolvedValue(null);

    await expect(RubricService.update('rubric-1', {
      apiVersion: 'v1',
      metadata: { name: 'A' },
      spec: { markdown: '| A | B |' },
    }, 'user-2')).rejects.toMatchObject({
      message: 'Rubric not found',
      statusCode: 404,
    });
  });

  test('prevents deleting a rubric referenced by a LEIA', async () => {
    RubricRepository.findOwnedById.mockResolvedValue({ _id: 'rubric-1' });
    LeiaRepository.findByRubricId.mockResolvedValue([
      { _id: 'leia-1', metadata: { name: 'Interview practice' } },
    ]);

    await expect(RubricService.delete('rubric-1', 'user-1')).rejects.toMatchObject({
      message: 'Cannot delete rubric in use',
      statusCode: 400,
      data: [{ id: 'leia-1', name: 'Interview practice' }],
    });
    expect(RubricRepository.deleteOwnedById).not.toHaveBeenCalled();
  });
});
