/**
 * Wizard routes - AI-powered LEIA creation
 */

import express from 'express';
import {
  createWizardSession,
  getWizardSession,
  sendWizardMessage,
  streamWizardProgress,
  saveGeneratedLeia,
  deleteWizardSession
} from '../../controllers/v1/wizardController.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = express.Router();

// All wizard routes require authentication
router.use(requireAuth);

// Create new wizard session
router.post('/sessions', createWizardSession);

// Get wizard session status
router.get('/sessions/:sessionId', getWizardSession);

// Send message to wizard (refinement/feedback)
router.post('/sessions/:sessionId/message', sendWizardMessage);

// Stream wizard progress via SSE
router.get('/sessions/:sessionId/stream', streamWizardProgress);

// Save generated LEIA to database
router.post('/sessions/:sessionId/save', saveGeneratedLeia);

// Delete wizard session
router.delete('/sessions/:sessionId', deleteWizardSession);

export default router;
