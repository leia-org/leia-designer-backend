import { describe, expect, test } from 'vitest';
import { updateExperimentOrchestrationValidator } from '../src/validators/v1/experimentValidator.js';

describe('experiment orchestration validation', () => {
  test('accepts a text MultiLEIA virtual graph configuration', async () => {
    const value = await updateExperimentOrchestrationValidator.validateAsync({
      mode: 'multi',
      maxInternalTurns: 2,
      openingLeiaId: '507f1f77bcf86cd799439011',
      problemLeiaId: '507f1f77bcf86cd799439012',
      sharedTask: 'Elicit the requirements collaboratively.',
    });

    expect(value.mode).toBe('multi');
    expect(value.maxInternalTurns).toBe(2);
    expect(value.problemLeiaId).toBe('507f1f77bcf86cd799439012');
  });

  test('rejects an unbounded number of internal turns', async () => {
    await expect(
      updateExperimentOrchestrationValidator.validateAsync({
        mode: 'multi',
        maxInternalTurns: 20,
        openingLeiaId: '507f1f77bcf86cd799439011',
        sharedTask: '',
      })
    ).rejects.toThrow();
  });
});
