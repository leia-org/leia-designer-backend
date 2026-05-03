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
  getApiKeyById,
  manageDefaultKey,
  getApiKeyValueForLeiaRunner
} from '../../controllers/v1/userController.js';

import { requireAdmin, requireAdvanced, requireInternToken, requireJwtAuthentication } from '../../middlewares/auth.js';
const router = express.Router();

// POST
router.post('/login', login); // No authentication or authorization required
router.post('/', requireAdmin, createUser);
router.post('/apikeys', requireAdvanced, createApiKey);
router.post('/apikeys/get-value', requireInternToken, getApiKeyValueForLeiaRunner);

// GET
router.get('/', requireAdmin, getUsers);
router.get('/email/:email', requireAdmin, getUserByEmail);
router.get('/apikeys', requireAdvanced, getApiKeys);
router.get('/apikeys/:apiKeyId', requireAdvanced, getApiKeyById);
router.get('/:id', requireAdmin, getUserById);
// PUT
router.put('/profile/update', requireJwtAuthentication, updateProfile);
router.put('/profile/change-password', requireJwtAuthentication, changePassword);
router.put('/apikeys/manage-default/:apiKeyId', requireAdvanced, manageDefaultKey)
router.put('/apikeys/:apiKeyId', requireAdvanced, updateApiKey);
router.put('/:id', requireJwtAuthentication, updateUser);

// DELETE
router.delete('/apikeys/:apiKeyId', requireAdvanced, deleteApiKey);
router.delete('/:id', requireAdmin, deleteUser);

export default router;
