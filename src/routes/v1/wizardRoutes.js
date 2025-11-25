import express from 'express';
import { chat } from '../../controllers/v1/wizardController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/chat', requireJwtAuthentication, chat);

export default router;
