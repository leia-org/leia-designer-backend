import express from 'express';
import {
  createLeia,
  createNewLeiaVersion,
  getLeiaById,
  existsLeiaByName,
  getLeiasByQuery,
  getLeiaByNameAndVersion,
  getLeiasByName,
  deleteLeiaById
} from '../../controllers/v1/leiaController.js';
import { requireJwtAuthentication, requireAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/version', requireJwtAuthentication, createNewLeiaVersion);
router.post('/', requireJwtAuthentication, createLeia);

// GET
router.get('/exists/:name', requireAuthentication, existsLeiaByName);
router.get('/name/:name', requireAuthentication, getLeiasByName);
router.get('/name/:name/version/:version', requireAuthentication, getLeiaByNameAndVersion);
router.get('/', requireAuthentication, getLeiasByQuery);
router.get('/:id', requireAuthentication, getLeiaById);

// DELETE
router.delete('/:id', requireJwtAuthentication, deleteLeiaById);

export default router;
