import express from 'express';
import {
  createExperiment,
  getExperimentById,
  getAllExperiments,
  updateExperimentName,
  regenerateExperimentCode,
  toggleExperimentIsActive,
  updateExperimentDuration,
  addExperimentLeia,
  updateExperimentLeia,
  deleteExperimentLeia
} from '../../controllers/v1/experimentController.js';

const router = express.Router();

// POST
router.post('/', createExperiment);
router.post('/:id/leias', addExperimentLeia);

// PATCH
router.patch('/:id/name', updateExperimentName);
router.patch('/:id/regenerate-code', regenerateExperimentCode);
router.patch('/:id/toggle-active', toggleExperimentIsActive);
router.patch('/:id/duration', updateExperimentDuration);

// PUT
router.put('/:id/leias/:leiaId', updateExperimentLeia);

// GET
router.get('/', getAllExperiments);
router.get('/:id', getExperimentById);

// DELETE
router.delete('/:id/leias/:leiaId', deleteExperimentLeia);

export default router;
