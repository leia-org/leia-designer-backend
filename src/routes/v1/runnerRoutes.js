import express from 'express';
import {
  initializeRunner,
  sendMessage,
} from '../../controllers/v1/runnerController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/initialize', requireJwtAuthentication, initializeRunner);
router.post('/:sessionId/messages', requireJwtAuthentication, sendMessage);

export default router;
