import { describe, expect, test } from 'vitest';
import { runnerLeiaValidator } from '../src/validators/v1/leiaValidator.js';

const objectId = '507f1f77bcf86cd799439011';

describe('runnerLeiaValidator', () => {
  test('accepts resolved LEIAs with optional presentation and runtime metadata', () => {
    const payload = {
      spec: {
        persona: {},
        behaviour: {
          spec: {
            description: 'Guide the student without writing code.',
          },
        },
        problem: {
          spec: {
            widgets: [{ name: 'python-editor' }],
          },
        },
        supervisorConfig: { enabled: false },
        avatar: '/avatars/valid-anagram.png',
        infographic: null,
        infographicSolution: '/infographics/valid-anagram-solution.png',
      },
      runnerConfiguration: {
        modelName: 'gpt-4.1-mini',
        apiKeyId: objectId,
      },
    };

    const { error, value } = runnerLeiaValidator.validate(payload, {
      abortEarly: false,
    });

    expect(error).toBeUndefined();
    expect(value.spec.supervisorConfig).toEqual({ enabled: false });
    expect(value.spec.avatar).toBe('/avatars/valid-anagram.png');
    expect(value.spec.infographic).toBeNull();
    expect(value.spec.infographicSolution).toBe(
      '/infographics/valid-anagram-solution.png'
    );
  });

  test('rejects unknown fields in the resolved LEIA spec', () => {
    const payload = {
      spec: {
        persona: {},
        behaviour: {
          spec: {
            description: 'Guide the student without writing code.',
          },
        },
        problem: {},
        unexpectedField: true,
      },
      runnerConfiguration: {
        modelName: 'gpt-4.1-mini',
        apiKeyId: objectId,
      },
    };

    const { error } = runnerLeiaValidator.validate(payload, {
      abortEarly: false,
    });

    expect(error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['spec', 'unexpectedField'],
          type: 'object.unknown',
        }),
      ])
    );
  });
});
