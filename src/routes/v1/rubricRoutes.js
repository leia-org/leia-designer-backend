import express from 'express';
import {
  createRubric,
  deleteRubric,
  getRubricById,
  getRubricSchema,
  getRubrics,
  updateRubric,
} from '../../controllers/RubricController.js';
import { requireAuthentication, requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuthentication, getRubrics);
router.get('/schema', requireAuthentication, getRubricSchema);
router.get('/:id', requireAuthentication, getRubricById);
router.post('/', requireJwtAuthentication, createRubric);
router.put('/:id', requireJwtAuthentication, updateRubric);
router.delete('/:id', requireJwtAuthentication, deleteRubric);

export default router;
