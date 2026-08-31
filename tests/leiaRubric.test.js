import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/repositories/v1/LeiaRepository.js', () => ({
  default: { create: vi.fn() },
}));
vi.mock('../src/services/v1/PersonaService.js', () => ({ default: {} }));
vi.mock('../src/services/v1/BehaviourService.js', () => ({ default: {} }));
vi.mock('../src/services/v1/ProblemService.js', () => ({ default: {} }));
vi.mock('../src/services/v1/ExperimentService.js', () => ({ default: {} }));
vi.mock('../src/services/v1/RubricService.js', () => ({
  default: { findById: vi.fn() },
}));
vi.mock('../src/utils/entity.js', () => ({
  canAccess: vi.fn(),
  createUnauthorizedError: vi.fn(),
  findEntity: vi.fn(async (identifier) => ({
    _id: `${identifier}-id`,
    toJSON: () => ({ id: `${identifier}-id`, isPublished: false, spec: {} }),
  })),
}));
vi.mock('../src/utils/leia.js', () => ({
  checkConstraints: vi.fn(),
  resolveExtensions: vi.fn((entities) => entities),
  resolveOverrides: vi.fn((entities) => entities),
  resolvePlaceholders: vi.fn((entities) => entities),
  synchronizeProcessTypes: vi.fn((entities) => entities),
}));
vi.mock('../src/utils/authClient.js', () => ({
  populateUserInEntity: vi.fn((entity) => entity),
}));

import LeiaRepository from '../src/repositories/v1/LeiaRepository.js';
import RubricService from '../src/services/v1/RubricService.js';
import LeiaService from '../src/services/v1/LeiaService.js';

describe('LEIA rubric snapshot', () => {
  beforeEach(() => vi.clearAllMocks());

  test('resolves an owned rubric and embeds it in the new LEIA', async () => {
    RubricService.findById.mockResolvedValue({
      _id: 'rubric-1',
      apiVersion: 'v1',
      metadata: { name: 'Interview rubric' },
      spec: { sections: [{ title: 'General', weight: 100, levels: ['B'], criteria: [] }] },
    });
    LeiaRepository.create.mockImplementation(async (value) => value);

    const created = await LeiaService.create({
      apiVersion: 'v1',
      metadata: { name: 'Interview practice', version: '1.0.0' },
      spec: {
        persona: 'persona',
        behaviour: 'behaviour',
        problem: 'problem',
        rubric: 'rubric-1',
      },
    }, { userId: 'user-1', role: 'instructor' });

    expect(RubricService.findById).toHaveBeenCalledWith('rubric-1', 'user-1');
    expect(created.spec.rubricId).toBe('rubric-1');
    expect(created.spec.rubric).toEqual({
      _id: 'rubric-1',
      apiVersion: 'v1',
      metadata: { name: 'Interview rubric' },
      spec: { sections: [{ title: 'General', weight: 100, levels: ['B'], criteria: [] }] },
    });
  });
});
