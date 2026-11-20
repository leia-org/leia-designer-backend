import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

vi.mock('../src/repositories/v1/ExperimentRepository.js', () => ({ default: {
  findById: vi.fn(), findByIdPopulated: vi.fn(), findAll: vi.fn(), update: vi.fn(),
  create: vi.fn(), updateStagedDraft: vi.fn(),
} }));
vi.mock('../src/utils/authClient.js', () => ({ populateUserInEntity: async (entity) => entity }));
vi.mock('../src/services/v1/WorkbenchService.js', () => ({ default: {} }));
vi.mock('../src/utils/logger.js', () => ({ default: { debug: vi.fn(), error: vi.fn() } }));

import repository from '../src/repositories/v1/ExperimentRepository.js';
import experimentRoutes from '../src/routes/v1/experimentRoutes.js';
import { auth } from '../src/middlewares/auth.js';
import errorHandler from '../src/middlewares/errorHandler.js';

let server, baseUrl, activity;
const secret = 'regression-only-signing-secret';
const headers = (id = 'owner', role = 'admin') => ({ Authorization: `Bearer ${jwt.sign({ id, role }, secret, { expiresIn: '5m' })}` });
const request = (path, options = {}) => fetch(`${baseUrl}/api/v1/experiments${path}`, { ...options, headers: { ...headers(), ...options.headers } });

beforeAll(async () => {
  const app = express();
  app.use(express.json(), auth);
  app.use('/api/v1/experiments', experimentRoutes);
  app.use(errorHandler);
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('JWT_SECRET', secret);
  vi.stubEnv('JWT_ISSUER', '');
  vi.stubEnv('JWT_AUDIENCE', '');
  activity = { id: 'activity', user: { id: 'owner' }, name: 'Draft activity', isPublished: false, leias: [{ id: 'leia', leia: { isPublished: true } }] };
  repository.findById.mockImplementation(async () => structuredClone(activity));
  repository.findByIdPopulated.mockImplementation(async () => structuredClone(activity));
  repository.update.mockImplementation(async (_id, changes) => Object.assign(activity, changes));
  repository.updateStagedDraft.mockImplementation(async (_experiment, changes) => Object.assign(activity, changes));
});
afterEach(() => vi.unstubAllEnvs());

describe('Designer activity HTTP lifecycle regressions', () => {
  test('new activities always start with a stage', async () => {
    repository.create.mockImplementation(async (draft) => draft);
    const response = await request('', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New activity' }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ stages: [{ id: expect.any(String) }], leias: [] });
  });

  test('a behaviour can reference any earlier stage and cannot move ahead of its source', async () => {
    const stages = Array.from({ length: 3 }, () => ({
      id: randomUUID(), orchestration: { mode: 'single' },
    }));
    stages[2].outputSources = { conversation: stages[0].id, submitedSolution: null };
    activity.stages = stages;
    activity.leias = stages.map(({ id: stageId }, index) => ({
      id: String(index), stageId,
      leia: { isPublished: true, spec: { behaviour: { spec: {
        description: index === 2 ? '{{previousStage.outputs.conversation}}' : 'Interview',
      } } } },
    }));
    const update = (ordered) => request('/activity/stages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stages: ordered }),
    });
    expect((await update(stages)).status).toBe(200);
    expect((await update([{ ...stages[0], name: 'Interview' }, ...stages.slice(1)])).status).toBe(400);
    expect((await update([stages[1], stages[2], stages[0]])).status).toBe(400);
    expect((await update([stages[2], stages[0], stages[1]])).status).toBe(400);
    expect(repository.updateStagedDraft).toHaveBeenCalledTimes(1);
    activity.stages[2].outputSources = { conversation: null, submitedSolution: null };
    expect((await request('/activity/publish', { method: 'PATCH' })).status).toBe(400);
  });

  test('each referenced stage output can be resolved from a different earlier stage', async () => {
    const stages = Array.from({ length: 3 }, () => ({
      id: randomUUID(), orchestration: { mode: 'single' },
    }));
    stages[2].outputSources = { conversation: stages[1].id, submitedSolution: stages[0].id };
    activity.stages = stages;
    activity.leias = stages.map(({ id: stageId }, index) => ({
      id: String(index), stageId,
      leia: { isPublished: true, spec: { behaviour: { spec: {
        description: index === 2
          ? '{{previousStage.outputs.submitedSolution}}\n{{previousStage.outputs.conversation}}'
          : 'Interview',
      } } } },
    }));
    const update = (ordered) => request('/activity/stages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stages: ordered }),
    });

    expect((await update(stages)).status).toBe(200);
    // Moving stage 2 after stage 3 invalidates conversation's source even though submitedSolution still points to stage 1.
    expect((await update([stages[0], stages[2], stages[1]])).status).toBe(400);

    // Missing one of the two referenced output sources blocks publishing.
    activity.stages[2].outputSources = { conversation: stages[1].id, submitedSolution: null };
    const missingSolution = await request('/activity/publish', { method: 'PATCH' });
    expect(missingSolution.status).toBe(400);
    expect((await missingSolution.json()).message).toBe('Select an earlier stage for submitted solution in stage 3');

    // Providing both earlier sources allows publishing.
    activity.stages[2].outputSources = { conversation: stages[1].id, submitedSolution: stages[0].id };
    expect((await request('/activity/publish', { method: 'PATCH' })).status).toBe(200);
  });

  test('blocks transcription mode on a stage whose conversation is referenced by a later stage', async () => {
    const stages = Array.from({ length: 3 }, () => ({
      id: randomUUID(), orchestration: { mode: 'single' },
    }));
    stages[2].outputSources = { conversation: stages[1].id, submitedSolution: stages[0].id };
    activity.stages = stages;
    activity.leias = stages.map(({ id: stageId }, index) => ({
      id: String(index), stageId,
      configuration: { mode: index === 0 ? 'transcription' : 'standard', data: {} },
      leia: { isPublished: true, spec: { behaviour: { spec: {
        description: index === 2
          ? '{{previousStage.outputs.submitedSolution}}\n{{previousStage.outputs.conversation}}'
          : 'Interview',
      } } } },
    }));
    const update = (ordered) => request('/activity/stages', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stages: ordered }),
    });

    // Stage 1 is in transcription mode and only supplies submitedSolution → allowed.
    expect((await update(stages)).status).toBe(200);

    // Pointing stage 3's conversation output at stage 1 (transcription) → rejected.
    const invalidStages = stages.map((stage, index) => index === 2
      ? { ...stage, outputSources: { conversation: stages[0].id, submitedSolution: stages[0].id } }
      : stage);
    const badConversationSource = await update(invalidStages);
    expect(badConversationSource.status).toBe(400);
    expect((await badConversationSource.json()).message).toBe(
      'Stage 1 cannot use transcription mode because stage 3 uses its conversation'
    );

    // Switching stage 2 to transcription while stage 3 references stage 2's conversation → rejected on publish.
    activity.leias[1].configuration.mode = 'transcription';
    const publishRejected = await request('/activity/publish', { method: 'PATCH' });
    expect(publishRejected.status).toBe(400);
    expect((await publishRejected.json()).message).toBe(
      'Stage 2 cannot use transcription mode because stage 3 uses its conversation'
    );
  });

  test.each([null, { isPublished: false }, undefined])('rejects missing or private LEIAs (%j)', async (leia) => {
    activity.leias.push({ id: 'invalid-leia', leia });
    const res = await request('/activity/publish', { method: 'PATCH' });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain('invalid-leia');
    expect(repository.update).not.toHaveBeenCalled();
    expect(activity.isPublished).toBe(false);
  });
  test('publishing a populated draft makes it immutable for subsequent edits', async () => {
    const published = await request('/activity/publish', { method: 'PATCH' });
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ isPublished: true });
    repository.update.mockClear();
    const edited = await request('/activity/name', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Changed' }) });
    expect(edited.status).toBe(409);
    expect(repository.update).not.toHaveBeenCalled();
  });

  test.each([[], undefined])('prevents publishing an activity without LEIAs (%s)', async (leias) => {
    activity.leias = leias;
    const res = await request('/activity/publish', { method: 'PATCH' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ message: 'Experiment must have an associated LEIA before publishing' });
    expect(repository.update).not.toHaveBeenCalled();
  });

  test.each(['instructor', 'advanced', 'read'])('owner with role %s cannot publish an activity', async (role) => {
    const res = await request('/activity/publish', { method: 'PATCH', headers: headers('owner', role) });
    expect(res.status).toBe(403);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(activity.isPublished).toBe(false);
  });

  test('another administrator cannot publish an activity', async () => {
    const res = await request('/activity/publish', { method: 'PATCH', headers: headers('other-user') });
    expect(res.status).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  test('missing activities return 404 rather than a publication error', async () => {
    activity = null;
    const res = await request('/missing/publish', { method: 'PATCH' });
    expect(res.status).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });

  test('unauthenticated publication never reaches persistence', async () => {
    const res = await fetch(`${baseUrl}/api/v1/experiments/activity/publish`, { method: 'PATCH' });
    expect(res.status).toBe(401);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  test('invalid pagination cursors are rejected before querying activities', async () => {
    const res = await request('?lastActivityId=invalid');
    expect(res.status).toBe(400);
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  test('search and cursor parameters reach the repository and preserve the pagination response', async () => {
    const cursor = '507f1f77bcf86cd799439011';
    const page = { experiments: [activity], nextCursor: '507f1f77bcf86cd799439012' };
    repository.findAll.mockResolvedValue(page);
    const res = await request(`?lastActivityId=${cursor}&text=router%20support`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(page);
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith(cursor, 'router support');
  });

  test('invalid name updates produce field validation errors without changing the draft', async () => {
    const res = await request('/activity/name', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '' }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ validationErrors: { name: expect.any(String) } });
    expect(repository.update).not.toHaveBeenCalled();
  });
});
