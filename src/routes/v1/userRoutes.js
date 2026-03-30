import express from 'express';
import {
  login,
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
  getUserByEmail,
  updateProfile,
  changePassword,
  createApiKey,
  getApiKeys,
  deleteApiKey,
  updateApiKey,
  getApiKeyById
} from '../../controllers/v1/userController.js';

import { requireAdmin, requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/login', login); // No authentication or authorization required
router.post('/', requireAdmin, createUser);
router.post('/apikeys', requireJwtAuthentication, createApiKey); // Custom authorization check in controller

// GET
router.get('/', requireAdmin, getUsers);
router.get('/email/:email', requireAdmin, getUserByEmail);
router.get('/apikeys', requireJwtAuthentication, getApiKeys);
router.get('/apikeys/:apiKeyId', requireJwtAuthentication, getApiKeyById);
router.get('/:id', requireAdmin, getUserById);
// PUT
router.put('/profile/update', requireJwtAuthentication, updateProfile);
router.put('/profile/change-password', requireJwtAuthentication, changePassword);
router.put('/apikeys/:apiKeyId', requireJwtAuthentication, updateApiKey); // Custom authorization check in controller
router.put('/:id', requireJwtAuthentication, updateUser); // Custom authorization check in controller

// DELETE
router.delete('/apikeys/:apiKeyId', requireJwtAuthentication, deleteApiKey); // Custom authorization check in controller
router.delete('/:id', requireAdmin, deleteUser);

export default router;
