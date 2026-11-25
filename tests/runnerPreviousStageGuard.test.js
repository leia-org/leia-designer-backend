import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/services/v1/RunnerService.js', () => ({
  default: {
    resolveProviderDriver: vi.fn(),
    initializeRunner: vi.fn(),
  },
}));

vi.mock('../src/services/v1/ConversationDynamicsService.js', () => ({
  default: {
    create: vi.fn(),
  },
}));

import RunnerService from '../src/services/v1/RunnerService.js';
import ConversationDynamicsService from '../src/services/v1/ConversationDynamicsService.js';
import { initializeRunner } from '../src/controllers/v1/runnerController.js';
import {
  hasAnyPreviousStageReference,
  PREVIOUS_STAGE_TEST_ERROR,
} from '../src/utils/activityStages.js';

const objectId = '507f1f77bcf86cd799439011';

const buildRequest = ({ behaviourDescription = 'Guide the student.', rubricEvaluationPrompt } = {}) => ({
  auth: { payload: { id: objectId } },
  body: {
    spec: {
      persona: { metadata: { name: 'Ana' }, spec: {} },
      behaviour: { spec: { description: behaviourDescription } },
      problem: { spec: { description: 'Solve the task.' } },
      ...(rubricEvaluationPrompt !== undefined
        ? {
            rubric: {
              apiVersion: 'v1',
              metadata: { name: 'Stage rubric' },
              spec: {
                evaluationPrompt: rubricEvaluationPrompt,
                sections: [
                  {
                    title: 'Content',
                    weight: 100,
                    levels: ['Score'],
                    criteria: [
                      {
                        name: 'Clarity',
                        descriptors: [{ level: 'Score', description: 'Strong' }],
                      },
                    ],
                  },
                ],
              },
            },
          }
        : {}),
    },
    runnerConfiguration: {
      modelName: 'gpt-4.1-mini',
      apiKeyId: objectId,
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  RunnerService.resolveProviderDriver.mockResolvedValue('openai-responses');
  RunnerService.initializeRunner.mockResolvedValue('session-123');
  ConversationDynamicsService.create.mockResolvedValue({});
});

describe('Designer test previousStage guard', () => {
  test.each([
    ['behaviour conversation output', { behaviourDescription: 'Review {{previousStage.outputs.conversation}}.' }],
    ['behaviour submitted solution output', { behaviourDescription: 'Grade {{previousStage.outputs.submitedSolution}}.' }],
    ['behaviour previous problem field', { behaviourDescription: 'Compare against {{previousStage.leia.problem.description}}.' }],
    ['behaviour unsupported previousStage reference', { behaviourDescription: 'Use {{previousStage.outputs.unknown}}.' }],
    ['rubric evaluationPrompt output reference', { rubricEvaluationPrompt: 'Check {{previousStage.outputs.submitedSolution}}.' }],
    ['rubric evaluationPrompt problem reference', { rubricEvaluationPrompt: 'Reference {{previousStage.leia.problem.solution}}.' }],
  ])('rejects initializeRunner with 400 when %s is present', async (_label, overrides) => {
    const req = buildRequest(overrides);
    const res = { json: vi.fn() };
    const next = vi.fn();

    await initializeRunner(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: PREVIOUS_STAGE_TEST_ERROR,
      })
    );
    expect(res.json).not.toHaveBeenCalled();
    expect(RunnerService.resolveProviderDriver).not.toHaveBeenCalled();
    expect(RunnerService.initializeRunner).not.toHaveBeenCalled();
    expect(ConversationDynamicsService.create).not.toHaveBeenCalled();
  });

  test('allows initializeRunner when only non-previousStage placeholders are used', async () => {
    const req = buildRequest({
      behaviourDescription: 'Act as {{persona.fullName}} for {{problem.description}}.',
      rubricEvaluationPrompt: 'Evaluate {{currentStage.outputs.conversation}} and {{currentStage.outputs.submitedSolution}}.',
    });
    const res = { json: vi.fn() };
    const next = vi.fn();

    await initializeRunner(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(RunnerService.resolveProviderDriver).toHaveBeenCalledWith('gpt-4.1-mini');
    expect(RunnerService.initializeRunner).toHaveBeenCalledOnce();
    expect(ConversationDynamicsService.create).toHaveBeenCalledWith(
      'session-123',
      objectId,
      { spec: req.body.spec },
      expect.objectContaining({
        modelName: 'gpt-4.1-mini',
        apiKeyId: objectId,
        apiKeyRequesterId: objectId,
        provider: 'openai-responses',
      })
    );
    expect(res.json).toHaveBeenCalledWith({ sessionId: 'session-123' });
  });

  test('hasAnyPreviousStageReference matches supported and malformed references without false positives', () => {
    expect(hasAnyPreviousStageReference({ spec: { behaviour: { spec: { description: '{{ previousStage.outputs.conversation }}' } } } })).toBe(true);
    expect(hasAnyPreviousStageReference({ spec: { rubric: { spec: { evaluationPrompt: '{{previousStage.custom}}' } } } })).toBe(true);
    expect(hasAnyPreviousStageReference({ spec: { behaviour: { spec: { description: 'Discuss previousStage concepts in plain text.' } } } })).toBe(false);
    expect(hasAnyPreviousStageReference({ spec: { rubric: { spec: { evaluationPrompt: '{{currentStage.outputs.conversation}}' } } } })).toBe(false);
    expect(hasAnyPreviousStageReference(null)).toBe(false);
  });
});
