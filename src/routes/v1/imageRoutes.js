import express from 'express';
import {
  generateLeiaAvatar,
  generateLeiaInfographic,
  generateLeiaInfographicSolution,
  generatePersonaAvatar,
  generateProblemAvatar
} from '../../controllers/v1/ImageController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';
import { createImageRegeneration, getLatestImageRegeneration } from '../../controllers/v1/ImageRegenerationController.js';

const router = express.Router();
router.post('/leias/:id/regenerations', requireJwtAuthentication, createImageRegeneration);
router.get('/leias/:id/regenerations/latest', requireJwtAuthentication, getLatestImageRegeneration);

router.post('/personas/:id/generate', requireJwtAuthentication, generatePersonaAvatar);
router.post('/problems/:id/generate', requireJwtAuthentication, generateProblemAvatar);
router.post('/leias/:id/generate', requireJwtAuthentication, generateLeiaAvatar);
router.post('/leias/:id/infographic/generate', requireJwtAuthentication, generateLeiaInfographic);
router.post('/leias/:id/infographic-solution/generate', requireJwtAuthentication, generateLeiaInfographicSolution);

export default router;
