import { describe, expect, test } from 'vitest';
import { validateActivityStages } from '../src/utils/activityStages.js';

const orchestration = {
  mode: 'single',
  maxInternalTurns: 2,
  openingLeiaId: null,
  problemLeiaId: null,
  sharedTask: '',
};

const makeEntry = (id, stageId, description, mode = 'standard') => ({
  id,
  stageId,
  configuration: { mode, data: {} },
  leia: {
    spec: {
      behaviour: { spec: { description } },
    },
  },
});

describe('validateActivityStages transcription guards', () => {
  test('rejects transcription mode in a consuming stage that references previous stage outputs', () => {
    const stages = [
      { id: 's1', outputSources: { conversation: null, submitedSolution: null }, orchestration },
      { id: 's2', outputSources: { conversation: null, submitedSolution: 's1' }, orchestration },
    ];
    const leias = [
      makeEntry('l1', 's1', 'Stage 1', 'standard'),
      makeEntry('l2', 's2', 'Review {{previousStage.outputs.submitedSolution}}', 'transcription'),
    ];

    expect(() => validateActivityStages(stages, leias, () => {}, true)).toThrow(
      /Stage 2 cannot use transcription mode because it uses outputs from an earlier stage/
    );
  });

  test('still allows transcription mode on a source stage when only submitedSolution is referenced', () => {
    const stages = [
      { id: 's1', outputSources: { conversation: null, submitedSolution: null }, orchestration },
      { id: 's2', outputSources: { conversation: null, submitedSolution: 's1' }, orchestration },
    ];
    const leias = [
      makeEntry('l1', 's1', 'Read static transcript', 'transcription'),
      makeEntry('l2', 's2', 'Review {{previousStage.outputs.submitedSolution}}', 'standard'),
    ];

    expect(() => validateActivityStages(stages, leias, () => {}, true)).not.toThrow();
  });

  test('validates previousStage.leia.problem.* references and requires a problem source before publishing', () => {
    const stages = [
      { id: 's1', outputSources: { conversation: null, submitedSolution: null, problem: null }, orchestration },
      { id: 's2', outputSources: { conversation: null, submitedSolution: null, problem: null }, orchestration },
    ];
    const leias = [
      makeEntry('l1', 's1', 'Stage 1', 'transcription'),
      makeEntry('l2', 's2', 'Compare against {{previousStage.leia.problem.description}} and {{previousStage.leia.problem.solution}}', 'standard'),
    ];

    expect(() => validateActivityStages(stages, leias, () => {}, false)).not.toThrow();
    expect(() => validateActivityStages(stages, leias, () => {}, true)).toThrow(
      /Select an earlier stage for problem in stage 2/
    );

    stages[1].outputSources.problem = 's1';
    expect(() => validateActivityStages(stages, leias, () => {}, true)).not.toThrow();

    const invalidLeias = [
      makeEntry('l1', 's1', 'Stage 1', 'standard'),
      makeEntry('l2', 's2', 'Invalid {{previousStage.leia.problem.unknownField}}', 'standard'),
    ];
    expect(() => validateActivityStages(stages, invalidLeias, () => {}, false)).toThrow(
      /Unsupported previous stage reference: previousStage\.leia\.problem\.unknownField/
    );
  });
});
