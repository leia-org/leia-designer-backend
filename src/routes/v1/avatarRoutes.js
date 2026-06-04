import express from 'express';
import {
  generateLeiaAvatar,
  generatePersonaAvatar,
  generateProblemAvatar,
} from '../../controllers/v1/AvatarController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/personas/:id/generate', requireJwtAuthentication, generatePersonaAvatar);
router.post('/problems/:id/generate', requireJwtAuthentication, generateProblemAvatar);
router.post('/leias/:id/generate', requireJwtAuthentication, generateLeiaAvatar);

export default router;
