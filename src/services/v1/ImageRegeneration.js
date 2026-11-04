import { randomUUID } from 'node:crypto';
import ImageRegeneration from '../../models/ImageRegeneration.js';
import { generateImageForTarget } from '../../controllers/v1/ImageController.js';
import logger from '../../utils/logger.js';

const LEASE_MS = 120000;

export function publicImageJob(job) {
  if (!job) return null;
  return { id: String(job._id), leiaId: String(job.leiaId), target: job.target,
    active: job.active, status: job.status, steps: job.steps, error: job.error,
    updatedAt: job.updatedAt };
}

export async function executeImageJob(id) {
  const lease = randomUUID();
  const filter = { _id: id, lease };
  const job = await ImageRegeneration.findOneAndUpdate(
    { _id: id, status: 'queued', active: true },
    { $set: { status: 'running', lease, leaseUntil: new Date(Date.now() + LEASE_MS) } },
    { new: true }
  ).select('+apiKeyId');
  if (!job) return;
  const heartbeat = setInterval(() => {
    void ImageRegeneration.updateOne(filter, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } })
      .catch(error => logger.error(`Image job heartbeat: ${error.message}`));
  }, 15000);
  heartbeat.unref();
  try {
    for (let index = 0; index < job.steps.length; index += 1) {
      const step = job.steps[index];
      const claimed = await ImageRegeneration.updateOne(filter, { $set: { [`steps.${index}.status`]: 'running' } });
      if (!claimed.matchedCount) return;
      try {
        const result = await generateImageForTarget(step.target, step.entityId,
          { userId: String(job.userId), role: job.role }, { apiKeyId: job.apiKeyId });
        step.status = 'completed';
        step.image = result[step.target === 'infographic' || step.target === 'infographicSolution' ? step.target : 'avatar'];
      } catch (error) {
        step.status = 'failed';
        step.error = error.response?.data?.message || error.message || 'Could not regenerate the image';
      }
      await ImageRegeneration.updateOne(filter, { $set: { [`steps.${index}`]: step.toObject() } });
    }
    const failed = job.steps.filter(step => step.status === 'failed').length;
    await ImageRegeneration.updateOne(filter, { $set: {
      active: false, status: failed === 0 ? 'completed' : failed === job.steps.length ? 'failed' : 'partial',
    }, $unset: { lease: 1, leaseUntil: 1 } });
  } catch (error) {
    logger.error(`Image job ${id}: ${error.message}`);
    // Leave the lease for recovery. Never retry an uncertain paid request silently.
  } finally { clearInterval(heartbeat); }
}

export async function startImageJobWorker() {
  await ImageRegeneration.init();
  let checking = false;
  const tick = async () => {
    if (checking) return;
    checking = true;
    try {
      await ImageRegeneration.updateMany({ active: true, status: 'running', leaseUntil: { $lt: new Date() } },
        { $set: { active: false, status: 'interrupted', error: 'Generation was interrupted on the server. Check the images before retrying.' } });
      const queued = await ImageRegeneration.findOne({ active: true, status: 'queued' }).sort({ createdAt: 1 });
      if (queued) await executeImageJob(queued._id);
    } catch (error) { logger.error(`Image job worker: ${error.message}`); }
    finally { checking = false; }
  };
  const timer = setInterval(() => { void tick(); }, 3000);
  timer.unref();
  void tick();
}
