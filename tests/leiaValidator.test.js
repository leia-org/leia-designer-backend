import { describe, expect, test } from 'vitest';
import { createLeiaValidator, runnerLeiaValidator } from '../src/validators/v1/leiaValidator.js';

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

  test('accepts an optional embedded rubric snapshot', () => {
    const payload = {
      spec: {
        persona: {},
        behaviour: { spec: { description: 'Guide the student.' } },
        problem: {},
        rubricId: objectId,
        rubric: {
          _id: objectId,
          apiVersion: 'v1',
          metadata: { name: 'Interview rubric' },
          spec: { sections: [{
            title: 'Content', weight: 100, levels: ['Score'],
            criteria: [{ name: 'Clarity', descriptors: [{ level: 'Score', description: 'Strong' }] }],
          }] },
        },
      },
    };

    const { error } = runnerLeiaValidator.validate(payload, { abortEarly: false });
    expect(error).toBeUndefined();
  });

  test('rejects the removed description field in embedded snapshots', () => {
    const payload = {
      spec: {
        persona: {},
        behaviour: { spec: { description: 'Guide the student.' } },
        problem: {},
        rubric: {
          apiVersion: 'v1',
          metadata: { name: 'Interview rubric', description: 'Legacy description' },
          spec: { sections: [{
            title: 'Content', weight: 100, levels: ['Score'],
            criteria: [{ name: 'Clarity', descriptors: [{ level: 'Score', description: 'Strong' }] }],
          }] },
        },
      },
    };

    const { error } = runnerLeiaValidator.validate(payload, { abortEarly: false });
    expect(error?.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: ['spec', 'rubric', 'metadata', 'description'], type: 'object.unknown' }),
    ]));
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

describe('createLeiaValidator rubric', () => {
  const baseLeia = {
    apiVersion: 'v1',
    metadata: { name: 'Interview practice' },
    spec: {
      persona: objectId,
      problem: objectId,
      behaviour: objectId,
    },
  };

  test('accepts an optional rubric identifier', () => {
    const { error } = createLeiaValidator.validate({
      ...baseLeia,
      spec: { ...baseLeia.spec, rubric: objectId },
    });
    expect(error).toBeUndefined();
  });

  test('rejects an invalid rubric identifier', () => {
    const { error } = createLeiaValidator.validate({
      ...baseLeia,
      spec: { ...baseLeia.spec, rubric: 'not-an-object-id' },
    });
    expect(error?.details[0].path).toEqual(['spec', 'rubric']);
  });
});
