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

const router = express.Router();

// POST
router.post('/login', login);
router.post('/', createUser);

// GET
router.get('/', getUsers);
router.get('/:id', getUserById);
router.get('/email/:email', getUserByEmail);

// PUT
router.put('/:id', updateUser);

// DELETE
router.delete('/:id', deleteUser);

export default router;
