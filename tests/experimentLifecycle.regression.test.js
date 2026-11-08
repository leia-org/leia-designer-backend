import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../src/repositories/v1/ExperimentRepository.js', () => ({ default: {
  findById: vi.fn(), findByIdPopulated: vi.fn(), findAll: vi.fn(), update: vi.fn(),
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
});
afterEach(() => vi.unstubAllEnvs());

describe('Designer activity HTTP lifecycle regressions', () => {
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
