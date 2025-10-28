import express from 'express';
import {
  initializeRunner,
  sendMessage,
  generateTranscription,
} from '../../controllers/v1/runnerController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/initialize', requireJwtAuthentication, initializeRunner);
router.post('/:sessionId/messages', requireJwtAuthentication, sendMessage);
router.post('/transcriptions/generate', requireJwtAuthentication, generateTranscription);

export default router;
