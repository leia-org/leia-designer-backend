import express from 'express';
import {
  createLeiaDraft,
  deleteLeiaDraft,
  getLeiaDrafts,
  updateLeiaDraft,
} from '../../controllers/v1/leiaDraftController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', requireJwtAuthentication, getLeiaDrafts);
router.post('/', requireJwtAuthentication, createLeiaDraft);
router.put('/:id', requireJwtAuthentication, updateLeiaDraft);
router.delete('/:id', requireJwtAuthentication, deleteLeiaDraft);

export default router;
