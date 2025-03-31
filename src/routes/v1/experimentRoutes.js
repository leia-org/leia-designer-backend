import express from 'express';
import {
  createExperiment,
  getExperimentById,
  getAllExperiments,
  updateExperimentName,
  addExperimentLeia,
  updateExperimentLeia,
  deleteExperimentLeia,
} from '../../controllers/v1/experimentController.js';

const router = express.Router();

// POST
router.post('/', createExperiment);
router.post('/:id/leias', addExperimentLeia);

// PATCH
router.patch('/:id/name', updateExperimentName);

// PUT
router.put('/:id/leias/:leiaId', updateExperimentLeia);

// GET
router.get('/', getAllExperiments);
router.get('/:id', getExperimentById);

// DELETE
router.delete('/:id/leias/:leiaId', deleteExperimentLeia);

export default router;
