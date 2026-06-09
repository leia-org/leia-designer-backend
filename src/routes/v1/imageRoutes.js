import express from 'express';
import {
  generateLeiaAvatar,
  generatePersonaAvatar,
  generateProblemAvatar,
  generateInfographic
} from '../../controllers/v1/ImageController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/personas/:id/generate', requireJwtAuthentication, generatePersonaAvatar);
router.post('/problems/:id/generate', requireJwtAuthentication, generateProblemAvatar);
router.post('/leias/:id/generate', requireJwtAuthentication, generateLeiaAvatar);
router.post('/infographics/generate', requireJwtAuthentication, generateInfographic);

export default router;
