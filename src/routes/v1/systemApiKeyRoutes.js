import express from 'express';
import {
  createSystemApiKey,
  updateSystemApiKey,
  deleteSystemApiKey
} from '../../controllers/v1/systemApiKeyController.js';

import { requireAdmin } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/', requireAdmin, createSystemApiKey);
// PUT
router.put('/:id', requireAdmin, updateSystemApiKey);

// DELETE
router.delete('/:id', requireAdmin, deleteSystemApiKey);

export default router;