/**
 * Wizard Controller - Proxy to Runner wizard endpoints
 */

import axios from 'axios';
import PersonaService from '../../services/PersonaService.js';
import ProblemService from '../../services/ProblemService.js';
import BehaviourService from '../../services/BehaviourService.js';

const RUNNER_URL = process.env.RUNNER_URL || 'http://localhost:5002';
const RUNNER_KEY = process.env.RUNNER_KEY;

/**
 * Create a new wizard session (proxied to Runner)
 */
export const createWizardSession = async (req, res, next) => {
  try {
    const { userPrompt } = req.body;

    if (!userPrompt) {
      const error = new Error('userPrompt is required');
      error.statusCode = 400;
      return next(error);
    }

    // Forward to Runner
    const response = await axios.post(
      `${RUNNER_URL}/api/v1/wizard/sessions`,
      { userPrompt },
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error creating wizard session:', error);
    next(error.response?.data || error);
  }
};

/**
 * Get wizard session status
 */
export const getWizardSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Forward to Runner
    const response = await axios.get(
      `${RUNNER_URL}/api/v1/wizard/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error getting wizard session:', error);
    next(error.response?.data || error);
  }
};

/**
 * Send message to wizard session (refinement/feedback)
 */
export const sendWizardMessage = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      const error = new Error('message is required');
      error.statusCode = 400;
      return next(error);
    }

    // Forward to Runner
    const response = await axios.post(
      `${RUNNER_URL}/api/v1/wizard/sessions/${sessionId}/message`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error sending wizard message:', error);
    next(error.response?.data || error);
  }
};

/**
 * Stream wizard progress via SSE (proxied to Runner)
 * Supports token in header or query parameter for EventSource compatibility
 */
export const streamWizardProgress = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const tokenFromQuery = req.query.token;

    // If token is in query, validate it
    if (tokenFromQuery && !req.auth) {
      try {
        const { verifyToken } = await import('../utils/jwt.js');
        req.auth = {
          method: 'JWT',
          payload: verifyToken(tokenFromQuery)
        };
      } catch (error) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Invalid token' })}\n\n`);
        res.end();
        return;
      }
    }

    // Ensure user is authenticated
    if (!req.auth) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Unauthorized' })}\n\n`);
      res.end();
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Stream from Runner
    const response = await axios.get(
      `${RUNNER_URL}/api/v1/wizard/sessions/${sessionId}/stream`,
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        },
        responseType: 'stream'
      }
    );

    // Pipe the stream from Runner to client
    response.data.pipe(res);

    // Handle client disconnect
    req.on('close', () => {
      response.data.destroy();
    });

  } catch (error) {
    console.error('Error streaming wizard progress:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Save generated LEIA to Designer database
 */
export const saveGeneratedLeia = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.auth.payload.userId;

    // Get the final LEIA from Runner
    const sessionResponse = await axios.get(
      `${RUNNER_URL}/api/v1/wizard/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        }
      }
    );

    const { persona, problem, behaviour, completed } = sessionResponse.data;

    if (!completed) {
      const error = new Error('LEIA is not completed yet');
      error.statusCode = 400;
      return next(error);
    }

    if (!persona || !problem || !behaviour) {
      const error = new Error('LEIA is incomplete - missing components');
      error.statusCode = 400;
      return next(error);
    }

    // Save persona
    const savedPersona = await PersonaService.create({
      ...persona,
      user: userId,
      isPublished: false
    });

    // Save problem
    const savedProblem = await ProblemService.create({
      ...problem,
      user: userId,
      isPublished: false
    });

    // Save behaviour
    const savedBehaviour = await BehaviourService.create({
      ...behaviour,
      user: userId,
      isPublished: false
    });

    // Delete the session from Runner
    await axios.delete(
      `${RUNNER_URL}/api/v1/wizard/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        }
      }
    ).catch(err => console.error('Error deleting wizard session:', err));

    res.json({
      success: true,
      leia: {
        persona: savedPersona,
        problem: savedProblem,
        behaviour: savedBehaviour
      }
    });

  } catch (error) {
    console.error('Error saving generated LEIA:', error);
    next(error);
  }
};

/**
 * Delete wizard session
 */
export const deleteWizardSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Forward to Runner
    const response = await axios.delete(
      `${RUNNER_URL}/api/v1/wizard/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${RUNNER_KEY}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error deleting wizard session:', error);
    next(error.response?.data || error);
  }
};
