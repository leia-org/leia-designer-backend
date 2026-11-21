import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/repositories/v1/ExperimentRepository.js', () => ({
  default: {
    findByIdPopulated: vi.fn(),
    updateStagedDraft: vi.fn(),
  },
}));
vi.mock('../src/utils/authClient.js', () => ({
  populateUserInEntity: vi.fn((entity) => entity),
}));

import ExperimentRepository from '../src/repositories/v1/ExperimentRepository.js';
import ExperimentService from '../src/services/v1/ExperimentService.js';

const stageId = '11111111-1111-4111-8111-111111111111';

const entry = (id, problemProcess, behaviourProcess) => ({
  id,
  stageId,
  configuration: { mode: 'standard' },
  leia: {
    metadata: { name: `LEIA ${id}` },
    spec: {
      problem: { spec: { process: problemProcess } },
      behaviour: { spec: { process: behaviourProcess } },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MultiLEIA shared problem', () => {
  test('stores opening and problem LEIAs independently when all behaviours match', async () => {
    const leias = [
      entry('opening', ['requirements-elicitation'], ['requirements-elicitation']),
      entry('problem', ['requirements-elicitation'], ['requirements-elicitation']),
    ];
    ExperimentRepository.findByIdPopulated.mockResolvedValue({ leias });
    ExperimentRepository.updateStagedDraft.mockImplementation(async (_exp, changes) => changes.stages[0].orchestration);

    const result = await ExperimentService.updateStages('experiment', [
      {
        id: stageId,
        orchestration: {
          mode: 'multi',
          maxInternalTurns: 2,
          openingLeiaId: 'opening',
          problemLeiaId: 'problem',
          sharedTask: '',
        },
      },
    ]);

    expect(result.openingLeiaId).toBe('opening');
    expect(result.problemLeiaId).toBe('problem');
  });

  test('does not cap the routed-message limit to the number of LEIAs', async () => {
    const leias = [
      entry('opening', ['requirements-elicitation'], ['requirements-elicitation']),
      entry('problem', ['requirements-elicitation'], ['requirements-elicitation']),
    ];
    ExperimentRepository.findByIdPopulated.mockResolvedValue({ leias });
    ExperimentRepository.updateStagedDraft.mockImplementation(async (_exp, changes) => changes.stages[0].orchestration);

    const result = await ExperimentService.updateStages('experiment', [
      {
        id: stageId,
        orchestration: {
          mode: 'multi',
          maxInternalTurns: 6,
          openingLeiaId: 'opening',
          problemLeiaId: 'problem',
          sharedTask: '',
        },
      },
    ]);

    expect(result.maxInternalTurns).toBe(6);
  });

  test('rejects a behaviour whose process differs from the shared problem', async () => {
    ExperimentRepository.findByIdPopulated.mockResolvedValue({
      leias: [
        entry('opening', ['game'], ['game']),
        entry('problem', ['requirements-elicitation'], ['requirements-elicitation']),
      ],
    });

    await expect(
      ExperimentService.updateStages('experiment', [
        {
          id: stageId,
          orchestration: {
            mode: 'multi',
            maxInternalTurns: 2,
            openingLeiaId: 'opening',
            problemLeiaId: 'problem',
            sharedTask: '',
          },
        },
      ])
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(ExperimentRepository.updateStagedDraft).not.toHaveBeenCalled();
  });
});
