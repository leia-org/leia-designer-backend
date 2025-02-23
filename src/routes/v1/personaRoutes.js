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

const router = express.Router();

// POST
router.post('/version', createNewPersonaVersion);
router.post('/', createPersona);

// GET
router.get('/exists/:name', existsPersonaByName);
router.get('/name/:name', getPersonasByName);
router.get('/name/:name/version/:version', getPersonaByNameAndVersion);
router.get('/', getPersonasByQuery);
router.get('/:id', getPersonaById);

export default router;
