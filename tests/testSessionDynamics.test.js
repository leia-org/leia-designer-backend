import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/models/RunnerTestSession.js', () => ({ default: {
  create: vi.fn(), findOne: vi.fn(), findById: vi.fn(), findOneAndUpdate: vi.fn(), updateOne: vi.fn(),
} }));
vi.mock('../src/services/v1/RunnerService.js', () => ({ default: {
  sendMessage: vi.fn(), evaluateStoppingCondition: vi.fn(), getEvaluationAndScore: vi.fn(),
} }));
import Model from '../src/models/RunnerTestSession.js';
import Runner from '../src/services/v1/RunnerService.js';
import Service, { publicDynamicsState } from '../src/services/v1/ConversationDynamicsService.js';
import { evaluate, getTestSession, sendMessage } from '../src/controllers/v1/runnerController.js';

let session;
beforeEach(() => {
  vi.clearAllMocks();
  session = { id: 'test', user: 'owner', messages: [], openingCompleted: false, stoppingSatisfied: false,
    leia: { spec: { behaviour: { spec: { description: 'Interviewer', conversationDynamics: {
      leiaSpeaksFirst: { enabled: true, config: { firstMessage: 'Introduce yourself' } },
      stoppingCondition: { enabled: true, config: { condition: 'The interview is over' } },
    } } } } }, runnerConfiguration: { modelName: 'model', apiKeyId: 'key', apiKeyRequesterId: 'owner' } };
  Model.findOne.mockResolvedValue(session);
  Model.findById.mockResolvedValue(session);
  Model.findOneAndUpdate.mockResolvedValue(session);
  Model.updateOne.mockImplementation(async (_query, update) => {
    Object.assign(session, update.$set);
    if (update.$push?.messages) session.messages.push(update.$push.messages);
  });
});

describe('Designer test conversation dynamics', () => {
  test('legacy behaviours allow evaluation without an opening', async () => {
    session.leia.spec.behaviour.spec.conversationDynamics = {};
    await Service.open(session);
    await expect(Service.assertCanFinish('test', 'owner')).resolves.toBeUndefined();
    expect(Runner.sendMessage).not.toHaveBeenCalled();
    expect(publicDynamicsState(session).canFinish).toBe(true);
  });

  test('opens once, forwards the internal opening flag and saves only the reply', async () => {
    Runner.sendMessage.mockResolvedValue({ message: 'Hello!' });
    await Service.open(session);
    await Service.open(session);
    expect(Runner.sendMessage).toHaveBeenCalledTimes(1);
    expect(Runner.sendMessage).toHaveBeenCalledWith('test', expect.stringContaining('<opening_instructions>'), { opening: true });
    expect(session.messages).toEqual([expect.objectContaining({ text: 'Hello!', isLeia: true })]);
    expect(session.openingCompleted).toBe(true);
  });

  test('a competing opening claim does not generate a second message', async () => {
    Model.findOneAndUpdate.mockResolvedValue(null);
    await Service.open(session);
    expect(Runner.sendMessage).not.toHaveBeenCalled();
  });

  test('failed opening releases its claim for retry', async () => {
    Runner.sendMessage.mockRejectedValueOnce(new Error('Provider unavailable'));
    await expect(Service.open(session)).rejects.toThrow('Provider unavailable');
    expect(Model.updateOne).toHaveBeenCalledWith({ _id: 'test' }, { $unset: { openingClaimedAt: 1 } });
    expect(session.openingCompleted).toBe(false);
  });

  test('opening alone cannot satisfy the condition', async () => {
    session.messages = [{ id: 'opening', text: 'Hello', isLeia: true }];
    await Service.observe('test');
    expect(Runner.evaluateStoppingCondition).not.toHaveBeenCalled();
    await expect(Service.assertCanFinish('test', 'owner')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('uses the saved transcript and trusted configuration, and keeps satisfaction monotonic', async () => {
    session.messages = [{ id: 'student', text: 'Bye', isLeia: false }, { id: 'reply', text: 'Goodbye', isLeia: true }];
    Runner.evaluateStoppingCondition.mockResolvedValue({ satisfied: true });
    await Service.observe('test');
    expect(Runner.evaluateStoppingCondition).toHaveBeenCalledWith('The interview is over',
      [{ role: 'student', text: 'Bye' }, { role: 'leia', text: 'Goodbye' }], 'Interviewer', session.runnerConfiguration);
    await Service.assertCanFinish('test', 'owner');
    expect(Runner.evaluateStoppingCondition).toHaveBeenCalledTimes(1);
    expect(publicDynamicsState(session).canFinish).toBe(true);
  });

  test('evaluation errors keep finishing blocked and can be retried', async () => {
    session.messages = [{ id: 'student', text: 'Bye', isLeia: false }, { id: 'reply', text: 'Bye', isLeia: true }];
    Runner.evaluateStoppingCondition.mockRejectedValueOnce(new Error('Provider unavailable'));
    await Service.observe('test');
    expect(publicDynamicsState(session).canFinish).toBe(false);
    Runner.evaluateStoppingCondition.mockResolvedValue({ satisfied: true });
    await Service.observe('test');
    expect(publicDynamicsState(session).canFinish).toBe(true);
  });

  test('another user cannot load or evaluate the test', async () => {
    Model.findOne.mockResolvedValue(null);
    await expect(Service.find('test', 'stranger')).rejects.toMatchObject({ statusCode: 404 });
    expect(Model.findOne).toHaveBeenCalledWith({ _id: 'test', user: 'stranger' });
  });

  test('direct evaluation requests cannot bypass the stopping condition', async () => {
    const next = vi.fn();
    await evaluate({ params: { sessionId: 'test' }, body: { result: 'solution', satisfied: true }, auth: { payload: { id: 'owner' } } }, { json: vi.fn() }, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(Runner.getEvaluationAndScore).not.toHaveBeenCalled();
  });

  test('public session data does not expose private prompts or credentials', async () => {
    session.openingCompleted = true;
    const json = vi.fn();
    await getTestSession({ params: { sessionId: 'test' }, auth: { payload: { id: 'owner' } } }, { json }, vi.fn());
    expect(Object.keys(json.mock.calls[0][0]).sort()).toEqual(['conversationDynamics', 'messages']);
  });

  test('tool calls are continued without counting tool results as student turns', async () => {
    session.openingCompleted = true;
    Runner.sendMessage.mockResolvedValueOnce({ toolCalls: [{ callId: 'call', name: 'editor' }] })
      .mockResolvedValueOnce({ message: 'Goodbye' });
    Runner.evaluateStoppingCondition.mockResolvedValue({ satisfied: true });
    const res = { json: vi.fn() };
    const next = vi.fn();
    const req = { params: { sessionId: 'test' }, auth: { payload: { id: 'owner' } }, body: { message: 'Check the editor' } };
    await sendMessage(req, res, next);
    expect(Runner.evaluateStoppingCondition).not.toHaveBeenCalled();
    await sendMessage({ ...req, body: { toolResults: [{ callId: 'call', output: 'done' }] } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(session.messages.map(({ text, isLeia }) => ({ text, isLeia }))).toEqual([
      { text: 'Check the editor', isLeia: false }, { text: 'Goodbye', isLeia: true },
    ]);
    expect(publicDynamicsState(session).canFinish).toBe(true);
  });
});
