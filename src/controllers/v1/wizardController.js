/**
 * Wizard Controller - Proxy to Runner wizard endpoints
 */

import axios from 'axios';
import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';
import BehaviourService from '../../services/v1/BehaviourService.js';
import LeiaService from '../../services/v1/LeiaService.js';

const RUNNER_URL = process.env.RUNNER_URL || 'http://localhost:5002';
const RUNNER_KEY = process.env.RUNNER_KEY;

/**
 * Create a new wizard session (proxied to Runner)
 */
export const createWizardSession = async (req, res, next) => {
  try {
    const { userPrompt } = req.body;
    const userToken = req.headers.authorization?.split(' ')[1]; // Extract JWT token

    if (!userPrompt) {
      const error = new Error('userPrompt is required');
      error.statusCode = 400;
      return next(error);
    }

    // Forward to Runner with user token
    const response = await axios.post(
      `${RUNNER_URL}/api/v1/wizard/sessions`,
      { userPrompt, userToken },
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

/**
 * Search personas (public + user's private)
 * GET /api/v1/wizard/search/personas
 */
export const searchUserPersonas = async (req, res, next) => {
  try {
    const { search, topic, limit = 10 } = req.query;
    const userId = req.auth.payload.userId;

    const filter = {
      $or: [
        { isPublished: true }, // Public components
        { user: userId } // User's private components
      ]
    };

    // Build comprehensive search
    const searchTerm = topic || search;
    if (searchTerm) {
      filter['$and'] = [{
        $or: [
          { 'metadata.name': { $regex: searchTerm, $options: 'i' } },
          { 'spec.fullName': { $regex: searchTerm, $options: 'i' } },
          { 'spec.firstName': { $regex: searchTerm, $options: 'i' } },
          { 'spec.description': { $regex: searchTerm, $options: 'i' } },
          { 'spec.personality': { $regex: searchTerm, $options: 'i' } },
          { 'spec.topic': { $regex: searchTerm, $options: 'i' } },
          { 'spec.emotionRange': { $regex: searchTerm, $options: 'i' } }
        ]
      }];
    }

    const personas = await PersonaService.getAll(filter);
    const limitedPersonas = personas.slice(0, parseInt(limit));

    res.json({
      count: limitedPersonas.length,
      personas: limitedPersonas
    });
  } catch (error) {
    console.error('Error searching user personas:', error);
    next(error);
  }
};

/**
 * Search problems (public + user's private)
 * GET /api/v1/wizard/search/problems
 */
export const searchUserProblems = async (req, res, next) => {
  try {
    const { search, topic, difficulty, format, limit = 10 } = req.query;
    const userId = req.auth.payload.userId;

    const filter = {
      $or: [
        { isPublished: true },
        { user: userId }
      ]
    };

    // Build comprehensive search
    const searchTerm = topic || search;
    if (searchTerm) {
      filter['$and'] = [{
        $or: [
          { 'metadata.name': { $regex: searchTerm, $options: 'i' } },
          { 'spec.description': { $regex: searchTerm, $options: 'i' } },
          { 'spec.personaBackground': { $regex: searchTerm, $options: 'i' } },
          { 'spec.details': { $regex: searchTerm, $options: 'i' } },
          { 'spec.solution': { $regex: searchTerm, $options: 'i' } },
          { 'spec.solutionFormat': { $regex: searchTerm, $options: 'i' } }
        ]
      }];
    }

    // Add specific filters
    if (difficulty) {
      filter['spec.difficulty'] = difficulty;
    }
    if (format) {
      filter['spec.solutionFormat'] = format;
    }

    const problems = await ProblemService.getAll(filter);
    const limitedProblems = problems.slice(0, parseInt(limit));

    res.json({
      count: limitedProblems.length,
      problems: limitedProblems
    });
  } catch (error) {
    console.error('Error searching user problems:', error);
    next(error);
  }
};

/**
 * Search behaviours (public + user's private)
 * GET /api/v1/wizard/search/behaviours
 */
export const searchUserBehaviours = async (req, res, next) => {
  try {
    const { search, role, process, limit = 10 } = req.query;
    const userId = req.auth.payload.userId;

    const filter = {
      $or: [
        { isPublished: true },
        { user: userId }
      ]
    };

    // Build comprehensive search
    if (search) {
      filter['$and'] = [{
        $or: [
          { 'metadata.name': { $regex: search, $options: 'i' } },
          { 'spec.description': { $regex: search, $options: 'i' } },
          { 'spec.role': { $regex: search, $options: 'i' } },
          { 'spec.process': { $regex: search, $options: 'i' } },
          { 'spec.instructions': { $regex: search, $options: 'i' } },
          { 'spec.approach': { $regex: search, $options: 'i' } }
        ]
      }];
    }

    // Add specific filters
    if (role && !search) {
      filter['spec.role'] = role;
    }
    if (process && !search) {
      filter['spec.process'] = process;
    }

    const behaviours = await BehaviourService.getAll(filter);
    const limitedBehaviours = behaviours.slice(0, parseInt(limit));

    res.json({
      count: limitedBehaviours.length,
      behaviours: limitedBehaviours
    });
  } catch (error) {
    console.error('Error searching user behaviours:', error);
    next(error);
  }
};

/**
 * Search LEIAs (public + user's private)
 * GET /api/v1/wizard/search/leias
 */
export const searchUserLeias = async (req, res, next) => {
  try {
    const { search, limit = 10 } = req.query;
    const userId = req.auth.payload.userId;

    const filter = {
      $or: [
        { isPublished: true },
        { user: userId }
      ]
    };

    // Build comprehensive search
    if (search) {
      filter['$and'] = [{
        $or: [
          { 'metadata.name': { $regex: search, $options: 'i' } },
          { 'metadata.description': { $regex: search, $options: 'i' } }
        ]
      }];
    }

    const leias = await LeiaService.getAll(filter);
    const limitedLeias = leias.slice(0, parseInt(limit));

    res.json({
      count: limitedLeias.length,
      leias: limitedLeias
    });
  } catch (error) {
    console.error('Error searching user LEIAs:', error);
    next(error);
  }
};
