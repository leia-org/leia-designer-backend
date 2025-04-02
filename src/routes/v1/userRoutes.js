import express from 'express';
import {
  login,
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
  getUserByEmail,
} from '../../controllers/v1/userController.js';

import { requireAdmin, requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/login', login); // No authentication or authorization required
router.post('/', requireAdmin, createUser);

// GET
router.get('/', requireAdmin, getUsers);
router.get('/:id', requireAdmin, getUserById);
router.get('/email/:email', requireAdmin, getUserByEmail);

// PUT
router.put('/:id', requireJwtAuthentication, updateUser); // Custom authorization check in controller

// DELETE
router.delete('/:id', requireAdmin, deleteUser);

export default router;
