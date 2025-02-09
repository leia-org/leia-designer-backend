import express from 'express';
import {
  createPersona,
  createNewPersonaVersion,
  getPersonaById,
  existsPersonaByName,
  getPersonaByQuery,
} from '../controllers/personaController.js';

const router = express.Router();

router.post('/', createPersona);
router.post('/version', createNewPersonaVersion);
router.get('/', getPersonaByQuery);
router.get('/exists/:name', existsPersonaByName);
router.get('/:id', getPersonaById);

export default router;
