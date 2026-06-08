import { describe, expect, test } from 'vitest';
import { runnerLeiaValidator } from '../src/validators/v1/leiaValidator.js';

const objectId = '0123456789abcdef01234567';

describe('runnerLeiaValidator', () => {
  test('allows supervisorConfig on designer try payloads', async () => {
    const payload = {
      spec: {
        personaId: objectId,
        behaviourId: objectId,
        problemId: objectId,
        persona: { spec: { fullName: 'Alice' } },
        behaviour: { spec: { description: 'Interview the student.' } },
        problem: { spec: { description: 'Gather requirements.' } },
        supervisorConfig: {
          enabled: true,
          instructions: 'Flag direct solution requests.',
          sensitivity: 'medium',
          cadence: 'everyN',
          everyN: 2,
          intervene: false,
          apiKeyId: objectId,
          apiKeyRequesterId: objectId,
          model: 'gpt-5.4-mini',
        },
      },
      runnerConfiguration: {
        modelName: 'gpt-5.4-mini',
        apiKeyId: objectId,
      },
    };

    await expect(runnerLeiaValidator.validateAsync(payload)).resolves.toMatchObject(payload);
  });
});
