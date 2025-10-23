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
import { auth, requireAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// Apply auth middleware to parse tokens from headers or query params
router.use(auth);

// Create new wizard session
router.post('/sessions', requireAuthentication, createWizardSession);

// Get wizard session status
router.get('/sessions/:sessionId', requireAuthentication, getWizardSession);

// Send message to wizard (refinement/feedback)
router.post('/sessions/:sessionId/message', requireAuthentication, sendWizardMessage);

// Stream wizard progress via SSE (handles token in query param)
router.get('/sessions/:sessionId/stream', streamWizardProgress);

// Save generated LEIA to database
router.post('/sessions/:sessionId/save', requireAuthentication, saveGeneratedLeia);

// Delete wizard session
router.delete('/sessions/:sessionId', requireAuthentication, deleteWizardSession);

export default router;
