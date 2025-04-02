import express from 'express';
import {
  createProblem,
  createNewProblemVersion,
  getProblemById,
  existsProblemByName,
  getProblemsByQuery,
  getProblemByNameAndVersion,
  getProblemsByName,
} from '../../controllers/v1/problemController.js';
import { requireAuthentication, requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/version', requireJwtAuthentication, createNewProblemVersion);
router.post('/', requireJwtAuthentication, createProblem);

// GET
router.get('/exists/:name', requireAuthentication, existsProblemByName);
router.get('/name/:name', requireAuthentication, getProblemsByName);
router.get('/name/:name/version/:version', requireAuthentication, getProblemByNameAndVersion);
router.get('/', requireAuthentication, getProblemsByQuery);
router.get('/:id', requireAuthentication, getProblemById);

export default router;
