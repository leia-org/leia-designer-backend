import express from 'express';
import {
  initializeRunner,
  sendMessage,
  generateTranscription,
  generateProblem,
  generateBehaviour,
  evaluate,
} from '../../controllers/v1/runnerController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/initialize', requireJwtAuthentication, initializeRunner);
router.post('/:sessionId/messages', requireJwtAuthentication, sendMessage);
router.post('/:sessionId/evaluate', requireJwtAuthentication, evaluate);
router.post('/transcriptions/generate', requireJwtAuthentication, generateTranscription);
router.post('/problems/generate', requireJwtAuthentication, generateProblem);
router.post('/behaviours/generate', requireJwtAuthentication, generateBehaviour);

export default router;
