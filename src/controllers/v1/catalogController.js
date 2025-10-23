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

    // Build comprehensive search across all persona fields
    const searchTerm = topic || search;
    if (searchTerm) {
      filter['$or'] = [
        { 'metadata.name': { $regex: searchTerm, $options: 'i' } },
        { 'spec.fullName': { $regex: searchTerm, $options: 'i' } },
        { 'spec.firstName': { $regex: searchTerm, $options: 'i' } },
        { 'spec.description': { $regex: searchTerm, $options: 'i' } },
        { 'spec.personality': { $regex: searchTerm, $options: 'i' } },
        { 'spec.topic': { $regex: searchTerm, $options: 'i' } },
        { 'spec.emotionRange': { $regex: searchTerm, $options: 'i' } }
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

    // Build comprehensive search across all problem fields
    const searchTerm = topic || search;
    if (searchTerm) {
      filter['$or'] = [
        { 'metadata.name': { $regex: searchTerm, $options: 'i' } },
        { 'spec.description': { $regex: searchTerm, $options: 'i' } },
        { 'spec.personaBackground': { $regex: searchTerm, $options: 'i' } },
        { 'spec.details': { $regex: searchTerm, $options: 'i' } },
        { 'spec.solution': { $regex: searchTerm, $options: 'i' } },
        { 'spec.solutionFormat': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Add specific filters if provided
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

    // Build comprehensive search across all behaviour fields
    if (search) {
      filter['$or'] = [
        { 'metadata.name': { $regex: search, $options: 'i' } },
        { 'spec.description': { $regex: search, $options: 'i' } },
        { 'spec.role': { $regex: search, $options: 'i' } },
        { 'spec.process': { $regex: search, $options: 'i' } },
        { 'spec.instructions': { $regex: search, $options: 'i' } },
        { 'spec.approach': { $regex: search, $options: 'i' } }
      ];
    }

    // Add specific filters if provided (these are exact matches, not searches)
    if (role && !search) {
      filter['spec.role'] = role;
    }

    if (process && !search) {
      filter['spec.process'] = process;
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
