import { afterEach, describe, expect, test, vi } from 'vitest';
import ImageRegeneration from '../src/models/ImageRegeneration.js';
import { executeImageJob, publicImageJob } from '../src/services/v1/ImageRegeneration.js';
import { generateImageForTarget } from '../src/controllers/v1/ImageController.js';

vi.mock('../src/controllers/v1/ImageController.js', () => ({ generateImageForTarget: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

describe('server image jobs', () => {
  test('runs serially, keeps successful results after a middle failure, and reports partial completion', async () => {
    const job = new ImageRegeneration({ leiaId: '000000000000000000000001', userId: '000000000000000000000002',
      role: 'advanced', apiKeyId: 'private-key-reference', target: 'all', steps: [
        { target: 'leias', entityId: 'leia' }, { target: 'problems', entityId: 'problem' }, { target: 'infographic', entityId: 'leia' },
      ] });
    vi.spyOn(ImageRegeneration, 'findOneAndUpdate').mockReturnValue({ select: vi.fn().mockResolvedValue(job) });
    const save = vi.spyOn(ImageRegeneration, 'updateOne').mockResolvedValue({ matchedCount: 1 });
    const order = [];
    let inFlight = 0;
    vi.mocked(generateImageForTarget).mockImplementation(async target => {
      expect(inFlight).toBe(0); inFlight += 1;
      await Promise.resolve();
      order.push(target); inFlight -= 1;
      if (target === 'problems') throw new Error('Provider quota');
      return { avatar: 'avatar?v=1', infographic: 'infographic?v=2' };
    });
    await executeImageJob(job._id);
    expect(order).toEqual(['leias', 'problems', 'infographic']);
    expect(save).toHaveBeenLastCalledWith(expect.any(Object), {
      $set: { active: false, status: 'partial' }, $unset: { lease: 1, leaseUntil: 1 },
    });
    expect(job.steps.map(step => step.status)).toEqual(['completed', 'failed', 'completed']);
    expect(job.steps[0].image).toBe('avatar?v=1');
    expect(job.steps[1].error).toBe('Provider quota');
    const visible = publicImageJob(job);
    expect(visible).not.toHaveProperty('apiKeyId');
    expect(visible).not.toHaveProperty('userId');
    expect(visible).not.toHaveProperty('lease');
  });

  test('an already claimed job cannot call the provider again', async () => {
    vi.spyOn(ImageRegeneration, 'findOneAndUpdate').mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    vi.mocked(generateImageForTarget).mockClear();
    await executeImageJob('000000000000000000000001');
    expect(generateImageForTarget).not.toHaveBeenCalled();
  });
});
