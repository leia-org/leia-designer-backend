import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import mongoose from 'mongoose';
import axios from 'axios';
import LeiaService from '../src/services/v1/LeiaService.js';
import ImageRegeneration from '../src/models/ImageRegeneration.js';
import { createImageRegeneration } from '../src/controllers/v1/ImageRegenerationController.js';
import { executeImageJob } from '../src/services/v1/ImageRegeneration.js';

vi.mock('../src/services/v1/ImageRegeneration.js', () => ({
  executeImageJob: vi.fn().mockResolvedValue(undefined),
  publicImageJob: job => ({ id: String(job._id), steps: job.steps }),
}));
afterEach(() => vi.restoreAllMocks());
beforeEach(() => vi.mocked(executeImageJob).mockResolvedValue(undefined));

function fixture(target) {
  const owner = new mongoose.Types.ObjectId();
  const foreign = new mongoose.Types.ObjectId();
  const leia = { _id: new mongoose.Types.ObjectId(), user: owner, spec: {
    problemId: new mongoose.Types.ObjectId(), personaId: new mongoose.Types.ObjectId(),
    problem: { user: String(owner) }, persona: { user: String(foreign) },
  } };
  vi.spyOn(LeiaService, 'findById').mockResolvedValue(leia);
  return { leia, req: { params: { id: String(leia._id) }, auth: { payload: { id: String(owner), role: 'advanced' } },
    body: { apiKeyId: 'key', target } }, res: { status: vi.fn().mockReturnThis(), json: vi.fn() }, next: vi.fn() };
}

test('all includes only the four permitted images and returns before generation completes', async () => {
  const { req, res, next } = fixture('all');
  vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
  const create = vi.spyOn(ImageRegeneration, 'create').mockImplementation(async data => ({ _id: 'job', ...data }));
  await createImageRegeneration(req, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(202);
  expect(create.mock.calls[0][0].steps.map(step => step.target)).toEqual(['leias', 'problems', 'infographic', 'infographicSolution']);
  expect(executeImageJob).toHaveBeenCalledWith('job');
});

test('a foreign persona is rejected before any key/provider call or job is created', async () => {
  const { req, res, next } = fixture('personas');
  const validate = vi.spyOn(axios, 'post');
  const create = vi.spyOn(ImageRegeneration, 'create');
  await createImageRegeneration(req, res, next);
  expect(next.mock.calls[0][0].statusCode).toBe(403);
  expect(validate).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});

test('a duplicate start reuses the owners active job', async () => {
  const { req, res, next } = fixture('all');
  vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
  vi.spyOn(ImageRegeneration, 'create').mockRejectedValue({ code: 11000 });
  vi.spyOn(ImageRegeneration, 'findOne').mockResolvedValue({ _id: 'existing', steps: [] });
  await createImageRegeneration(req, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({ id: 'existing', steps: [] });
});
