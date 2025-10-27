import express from 'express';
import { requireCatalogApiKey } from '../../middlewares/auth.js';
import {
  getPublicPersonas,
  getPublicProblems,
  getPublicBehaviours,
  getPublicLeias,
  getPersonaById,
  getProblemById,
  getBehaviourById,
  getLeiaById
} from '../../controllers/v1/catalogController.js';

const router = express.Router();

// All catalog endpoints require catalog API key
router.use(requireCatalogApiKey);

// GET endpoints for searching public components
router.get('/personas', getPublicPersonas);
router.get('/problems', getPublicProblems);
router.get('/behaviours', getPublicBehaviours);
router.get('/leias', getPublicLeias);

// GET endpoints for specific components by ID
router.get('/personas/:id', getPersonaById);
router.get('/problems/:id', getProblemById);
router.get('/behaviours/:id', getBehaviourById);
router.get('/leias/:id', getLeiaById);

export default router;
