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

const router = express.Router();

// POST
router.post('/version', createNewProblemVersion);
router.post('/', createProblem);

// GET
router.get('/exists/:name', existsProblemByName);
router.get('/name/:name', getProblemsByName);
router.get('/name/:name/version/:version', getProblemByNameAndVersion);
router.get('/', getProblemsByQuery);
router.get('/:id', getProblemById);

export default router;
