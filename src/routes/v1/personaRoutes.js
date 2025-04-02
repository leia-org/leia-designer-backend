import express from 'express';
import {
  createPersona,
  createNewPersonaVersion,
  getPersonaById,
  existsPersonaByName,
  getPersonasByQuery,
  getPersonaByNameAndVersion,
  getPersonasByName,
} from '../../controllers/v1/personaController.js';

import { requireJwtAuthentication, requireAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/version', requireJwtAuthentication, createNewPersonaVersion);
router.post('/', requireJwtAuthentication, createPersona);

// GET
router.get('/exists/:name', requireAuthentication, existsPersonaByName);
router.get('/name/:name', requireAuthentication, getPersonasByName);
router.get('/name/:name/version/:version', requireAuthentication, getPersonaByNameAndVersion);
router.get('/', requireAuthentication, getPersonasByQuery);
router.get('/:id', requireAuthentication, getPersonaById);

export default router;
