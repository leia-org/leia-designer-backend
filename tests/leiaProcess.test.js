import { describe, expect, test } from 'vitest';
import { synchronizeProcessTypes } from '../src/utils/leia.js';

describe('synchronizeProcessTypes', () => {
  test('uses the problem process as the LEIA-wide process', () => {
    const leia = {
      problem: { spec: { process: ['requirements-elicitation'] } },
      behaviour: { spec: { process: ['game'] } },
    };

    synchronizeProcessTypes(leia);

    expect(leia.problem.spec.process).toEqual(['requirements-elicitation']);
    expect(leia.behaviour.spec.process).toEqual(['requirements-elicitation']);
    expect(leia.behaviour.spec.process).not.toBe(leia.problem.spec.process);
  });

  test('keeps both components aligned when the problem has no process', () => {
    const leia = {
      problem: { spec: {} },
      behaviour: { spec: { process: ['game'] } },
    };

    synchronizeProcessTypes(leia);

    expect(leia.problem.spec.process).toEqual([]);
    expect(leia.behaviour.spec.process).toEqual([]);
  });
});
