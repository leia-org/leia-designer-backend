import PersonaService from '../../services/v1/PersonaService.js';
import ProblemService from '../../services/v1/ProblemService.js';
import BehaviourService from '../../services/v1/BehaviourService.js';

/**
 * Get public personas from catalog
 * GET /api/v1/catalog/personas
 */
export const getPublicPersonas = async (req, res, next) => {
  try {
    const { topic, limit = 10, search } = req.query;

    const filter = {
      isPublished: true // Only public components
    };

    if (topic) {
      filter['$or'] = [
        { 'spec.personality': { $regex: topic, $options: 'i' } },
        { 'metadata.name': { $regex: topic, $options: 'i' } }
      ];
    }

    if (search) {
      filter['$or'] = [
        { 'spec.personality': { $regex: search, $options: 'i' } },
        { 'spec.name': { $regex: search, $options: 'i' } },
        { 'metadata.name': { $regex: search, $options: 'i' } }
      ];
    }

    const personas = await PersonaService.getAll(filter);

    // Limit results
    const limitedPersonas = personas.slice(0, parseInt(limit));

    res.json({
      count: limitedPersonas.length,
      personas: limitedPersonas
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Get public problems from catalog
 * GET /api/v1/catalog/problems
 */
export const getPublicProblems = async (req, res, next) => {
  try {
    const { topic, difficulty, format, limit = 10, search } = req.query;

    const filter = {
      isPublished: true
    };

    if (topic || search) {
      filter['$or'] = [
        { 'spec.description': { $regex: topic || search, $options: 'i' } },
        { 'spec.background': { $regex: topic || search, $options: 'i' } },
        { 'metadata.name': { $regex: topic || search, $options: 'i' } }
      ];
    }

    if (difficulty) {
      filter['spec.difficulty'] = difficulty;
    }

    if (format) {
      filter['spec.solutionFormat'] = format;
    }

    const problems = await ProblemService.getAll(filter);

    // Limit results
    const limitedProblems = problems.slice(0, parseInt(limit));

    res.json({
      count: limitedProblems.length,
      problems: limitedProblems
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Get public behaviours from catalog
 * GET /api/v1/catalog/behaviours
 */
export const getPublicBehaviours = async (req, res, next) => {
  try {
    const { role, process, limit = 10, search } = req.query;

    const filter = {
      isPublished: true
    };

    if (role) {
      filter['spec.role'] = role;
    }

    if (process) {
      filter['spec.process'] = process;
    }

    if (search) {
      filter['$or'] = [
        { 'spec.description': { $regex: search, $options: 'i' } },
        { 'spec.role': { $regex: search, $options: 'i' } },
        { 'metadata.name': { $regex: search, $options: 'i' } }
      ];
    }

    const behaviours = await BehaviourService.getAll(filter);

    // Limit results
    const limitedBehaviours = behaviours.slice(0, parseInt(limit));

    res.json({
      count: limitedBehaviours.length,
      behaviours: limitedBehaviours
    });

  } catch (err) {
    next(err);
  }
};

/**
 * Get a specific persona by ID
 * GET /api/v1/catalog/personas/:id
 */
export const getPersonaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const persona = await PersonaService.getById(id);

    if (!persona || !persona.isPublished) {
      const error = new Error('Persona not found or not public');
      error.statusCode = 404;
      throw error;
    }

    res.json(persona);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a specific problem by ID
 * GET /api/v1/catalog/problems/:id
 */
export const getProblemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const problem = await ProblemService.getById(id);

    if (!problem || !problem.isPublished) {
      const error = new Error('Problem not found or not public');
      error.statusCode = 404;
      throw error;
    }

    res.json(problem);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a specific behaviour by ID
 * GET /api/v1/catalog/behaviours/:id
 */
export const getBehaviourById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const behaviour = await BehaviourService.getById(id);

    if (!behaviour || !behaviour.isPublished) {
      const error = new Error('Behaviour not found or not public');
      error.statusCode = 404;
      throw error;
    }

    res.json(behaviour);
  } catch (err) {
    next(err);
  }
};
