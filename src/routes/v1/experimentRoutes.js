import express from 'express';
import {
  createExperiment,
  getExperimentById,
  getAllExperiments,
  updateExperimentName,
  addExperimentLeia,
  updateExperimentLeia,
  deleteExperimentLeia,
  publishExperiment,
} from '../../controllers/v1/experimentController.js';
import { requireJwtAuthentication, requireAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/', requireJwtAuthentication, createExperiment);
router.post('/:id/leias', requireJwtAuthentication, addExperimentLeia);

// PATCH
router.patch('/:id/name', requireJwtAuthentication, updateExperimentName);
router.patch('/:id/publish', requireJwtAuthentication, publishExperiment);

// PUT
router.put('/:id/leias/:leiaId', requireJwtAuthentication, updateExperimentLeia);

// GET
router.get('/', requireAuthentication, getAllExperiments);
router.get('/:id', requireAuthentication, getExperimentById);

// DELETE
router.delete('/:id/leias/:leiaId', requireJwtAuthentication, deleteExperimentLeia);

export default router;
