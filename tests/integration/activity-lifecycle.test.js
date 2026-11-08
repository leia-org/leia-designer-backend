import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Experiment from '../../src/models/Experiment.js';
import Leia from '../../src/models/Leia.js';
import experimentRoutes from '../../src/routes/v1/experimentRoutes.js';
import { auth } from '../../src/middlewares/auth.js';
import errorHandler from '../../src/middlewares/errorHandler.js';
import { connectMongo, closeMongo, listen } from './support.js';

let http, authPeer, leia;
const owner = new mongoose.Types.ObjectId().toString();
const other = new mongoose.Types.ObjectId().toString();
const token = (id = owner, role = 'admin') => jwt.sign({ id, role }, 'integration-signing-secret', { expiresIn: '5m' });
const request = (path, method = 'GET', body, id = owner, role = 'admin') => fetch(`${http.url}/api/v1/experiments${path}`, {
  method, headers: { Authorization: `Bearer ${token(id, role)}`, 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'integration-signing-secret'); vi.stubEnv('JWT_ISSUER', ''); vi.stubEnv('JWT_AUDIENCE', '');
  vi.stubEnv('INTERN_TOKEN', 'integration-intern');
  await connectMongo(); await Experiment.init(); await Leia.init();
  leia = await Leia.create({ metadata: { name: 'Integration LEIA' }, user: owner });
  const peer = express();
  peer.get('/api/v1/users/intern/:id', (req, res) => {
    if (req.headers['x-intern-token'] !== 'integration-intern') return res.sendStatus(401);
    res.json({ id: req.params.id, email: 'owner@example.test', role: 'advanced' });
  });
  authPeer = await listen(peer); vi.stubEnv('AUTH_SERVICE_URL', authPeer.url);
  const app = express(); app.use(express.json(), auth); app.use('/api/v1/experiments', experimentRoutes); app.use(errorHandler);
  http = await listen(app);
});
afterAll(async () => { await http?.close(); await authPeer?.close(); await closeMongo(); vi.unstubAllEnvs(); });

test('create → attach a real LEIA → publish → read populates resources and prevents later edits', async () => {
  const created = await request('', 'POST', { name: 'Published integration activity' });
  expect(created.status).toBe(201);
  const activity = await created.json();
  expect((await Experiment.findById(activity.id)).user.toString()).toBe(owner);
  expect((await request(`/${activity.id}/publish`, 'PATCH')).status).toBe(400);
  expect((await request(`/${activity.id}/leias`, 'POST', { leia: leia.id })).status).toBe(200);
  expect((await request(`/${activity.id}/publish`, 'PATCH', undefined, other)).status).toBe(403);
  for (const role of ['instructor', 'advanced', 'read']) {
    expect((await request(`/${activity.id}/publish`, 'PATCH', undefined, owner, role)).status).toBe(403);
    expect((await Experiment.findById(activity.id)).isPublished).toBe(false);
  }
  expect((await request(`/${activity.id}/publish`, 'PATCH')).status).toBe(400);
  expect((await Experiment.findById(activity.id)).isPublished).toBe(false);
  await Leia.updateOne({ _id: leia.id }, { isPublished: true });
  const published = await request(`/${activity.id}/publish`, 'PATCH');
  expect(published.status).toBe(200);
  expect((await Experiment.findById(activity.id)).isPublished).toBe(true);
  const read = await (await request(`/${activity.id}`)).json();
  expect(read.leias[0].leia.metadata.name).toBe('Integration LEIA');
  expect(read.user.id).toBe(owner);
  expect((await request(`/${activity.id}/name`, 'PATCH', { name: 'Forbidden rename' })).status).toBe(409);
  expect((await Experiment.findById(activity.id)).name).toBe('Published integration activity');
});

test('unique-name conflicts and cursor/search filtering use the real MongoDB indexes and queries', async () => {
  expect((await request('', 'POST', { name: 'Searchable router activity' })).status).toBe(201);
  expect((await request('', 'POST', { name: 'Searchable router activity' })).status).toBe(409);
  await Experiment.insertMany(Array.from({ length: 12 }, (_, index) => ({ name: `Pagination router ${index}`, user: owner })));
  await Experiment.create({ name: 'Unrelated activity', user: owner });
  const first = await (await request('/user/me?visibility=private&text=Pagination%20router')).json();
  expect(first.experiments).toHaveLength(10);
  expect(first.nextCursor).toBeTruthy();
  const second = await (await request(`/user/me?visibility=private&text=Pagination%20router&lastActivityId=${first.nextCursor}`)).json();
  expect(second.experiments).toHaveLength(2);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.experiments, ...second.experiments].map((activity) => activity.id)).size).toBe(12);
});
