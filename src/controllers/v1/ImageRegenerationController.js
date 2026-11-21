import mongoose from 'mongoose';
import LeiaService from '../../services/v1/LeiaService.js';
import ImageRegeneration from '../../models/ImageRegeneration.js';
import { canModify, getGeminiApiKeyConfig, validateGeminiApiKey } from './ImageController.js';
import { executeImageJob, publicImageJob } from '../../services/v1/ImageRegeneration.js';
import logger from '../../utils/logger.js';

const targets = ['leias', 'problems', 'personas', 'infographic', 'infographicSolution'];

async function loadLeia(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw Object.assign(new Error('Invalid LEIA ID'), { statusCode: 400 });
  const context = { userId: req.auth.payload.id, role: req.auth.payload.role };
  const leia = await LeiaService.findById(req.params.id, context);
  if (!leia) throw Object.assign(new Error('LEIA not found'), { statusCode: 404 });
  return { leia, context };
}

export async function createImageRegeneration(req, res, next) {
  try {
    const apiKeyConfig = getGeminiApiKeyConfig(req);
    const { leia, context } = await loadLeia(req);
    const target = req.body.target;
    if (target !== 'all' && !targets.includes(target)) throw Object.assign(new Error('Invalid image target'), { statusCode: 400 });
    const steps = targets.flatMap(item => {
      const component = item === 'problems' ? leia.spec.problem : item === 'personas' ? leia.spec.persona : leia;
      const entityId = item === 'problems' ? leia.spec.problemId : item === 'personas' ? leia.spec.personaId : leia._id;
      return (target === 'all' || target === item) && entityId && canModify(component, context)
        ? [{ target: item, entityId: String(entityId), status: 'queued' }] : [];
    });
    if (!steps.length) throw Object.assign(new Error('No permitted images to regenerate'), { statusCode: 403 });
    await validateGeminiApiKey(apiKeyConfig);
    let job;
    try {
      job = await ImageRegeneration.create({ leiaId: leia._id, userId: context.userId, role: context.role,
        apiKeyId: apiKeyConfig.apiKeyId, target, steps });
    } catch (error) {
      if (error.code !== 11000) throw error;
      job = await ImageRegeneration.findOne({ leiaId: leia._id, userId: context.userId, active: true });
      if (!job) throw Object.assign(new Error('This LEIA already has an image generation in progress'), { statusCode: 409 });
    }
    res.status(202).json(publicImageJob(job));
    void executeImageJob(job._id).catch(error => logger.error(`Starting image job: ${error.message}`));
  } catch (error) { next(error); }
}

export async function getLatestImageRegeneration(req, res, next) {
  try {
    await loadLeia(req);
    const job = await ImageRegeneration.findOne({ leiaId: req.params.id, userId: req.auth.payload.id }).sort({ createdAt: -1 });
    res.set('Cache-Control', 'no-store').json(publicImageJob(job));
  } catch (error) { next(error); }
}
