/**
 * Wizard Controller - Proxy to Runner wizard endpoints
 */

import axios from 'axios';
import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';
import BehaviourService from '../../services/v1/BehaviourService.js';

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
 * Token authentication is handled by auth middleware (supports query param for EventSource)
 */
export const streamWizardProgress = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Ensure user is authenticated (should be set by auth middleware)
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

    // Debug logging
    console.log('Session data received:', {
      completed,
      hasPersona: !!persona,
      hasProblem: !!problem,
      hasBehaviour: !!behaviour,
      personaKeys: persona ? Object.keys(persona) : [],
      problemKeys: problem ? Object.keys(problem) : [],
      behaviourKeys: behaviour ? Object.keys(behaviour) : []
    });

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

    // Validate structure
    if (!persona.metadata || !persona.spec) {
      console.error('Invalid persona structure:', persona);
      const error = new Error('Invalid persona structure - missing metadata or spec');
      error.statusCode = 400;
      return next(error);
    }

    if (!problem.metadata || !problem.spec) {
      console.error('Invalid problem structure:', problem);
      const error = new Error('Invalid problem structure - missing metadata or spec');
      error.statusCode = 400;
      return next(error);
    }

    if (!behaviour.metadata || !behaviour.spec) {
      console.error('Invalid behaviour structure:', behaviour);
      const error = new Error('Invalid behaviour structure - missing metadata or spec');
      error.statusCode = 400;
      return next(error);
    }

    // Prepare data for saving
    // The wizard generates components with apiVersion, metadata, spec structure
    const personaData = {
      apiVersion: persona.apiVersion || 'v1',
      metadata: persona.metadata,
      spec: persona.spec,
      user: userId,
      isPublished: false
    };

    const problemData = {
      apiVersion: problem.apiVersion || 'v1',
      metadata: problem.metadata,
      spec: problem.spec,
      user: userId,
      isPublished: false
    };

    const behaviourData = {
      apiVersion: behaviour.apiVersion || 'v1',
      metadata: behaviour.metadata,
      spec: behaviour.spec,
      user: userId,
      isPublished: false
    };

    // Save persona
    const savedPersona = await PersonaService.create(personaData);

    // Save problem
    const savedProblem = await ProblemService.create(problemData);

    // Save behaviour
    const savedBehaviour = await BehaviourService.create(behaviourData);

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
