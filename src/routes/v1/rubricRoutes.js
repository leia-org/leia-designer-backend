import express from 'express';
import {
  createRubric,
  deleteRubric,
  getRubricById,
  getRubricSchema,
  getRubrics,
  updateRubric,
} from '../../controllers/RubricController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.use(requireJwtAuthentication);
router.get('/', getRubrics);
router.get('/schema', getRubricSchema);
router.get('/:id', getRubricById);
router.post('/', createRubric);
router.put('/:id', updateRubric);
router.delete('/:id', deleteRubric);

export default router;
