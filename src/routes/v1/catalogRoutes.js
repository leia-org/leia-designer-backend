import express from 'express';
import { requireCatalogApiKey } from '../../middlewares/auth.js';
import {
  getPublicPersonas,
  getPublicProblems,
  getPublicBehaviours,
  getPersonaById,
  getProblemById,
  getBehaviourById
} from '../../controllers/v1/catalogController.js';

const router = express.Router();

// All catalog endpoints require catalog API key
router.use(requireCatalogApiKey);

// GET endpoints for searching public components
router.get('/personas', getPublicPersonas);
router.get('/problems', getPublicProblems);
router.get('/behaviours', getPublicBehaviours);

// GET endpoints for specific components by ID
router.get('/personas/:id', getPersonaById);
router.get('/problems/:id', getProblemById);
router.get('/behaviours/:id', getBehaviourById);

export default router;
