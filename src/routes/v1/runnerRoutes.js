import express from 'express';
import multer from 'multer';
import {
  initializeRunner,
  sendMessage,
  generateTranscription,
  generateProblem,
  generateBehaviour,
  evaluate,
  openProblemChat,
  uploadProblemChatFile,
  sendProblemChatMessage,
} from '../../controllers/v1/runnerController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// In-memory PDF uploads for the problem-chat assistant (forwarded to the runner).
const uploadPdf = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/initialize', requireJwtAuthentication, initializeRunner);
router.post('/:sessionId/messages', requireJwtAuthentication, sendMessage);
router.post('/:sessionId/evaluate', requireJwtAuthentication, evaluate);
router.post('/transcriptions/generate', requireJwtAuthentication, generateTranscription);
router.post('/problems/generate', requireJwtAuthentication, generateProblem);
router.post('/behaviours/generate', requireJwtAuthentication, generateBehaviour);

// Problem-chat assistant (design-time): attach PDFs, chat; tools run in the FE.
router.post('/problem-chat/session', requireJwtAuthentication, openProblemChat);
router.post('/problem-chat/:chatId/files', requireJwtAuthentication, uploadPdf.single('file'), uploadProblemChatFile);
router.post('/problem-chat/:chatId/messages', requireJwtAuthentication, sendProblemChatMessage);


export default router;
