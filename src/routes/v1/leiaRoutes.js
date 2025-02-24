import express from 'express';
import {
  createLeia,
  createNewLeiaVersion,
  getLeiaById,
  existsLeiaByName,
  getLeiasByQuery,
  getLeiaByNameAndVersion,
  getLeiasByName,
} from '../../controllers/v1/leiaController.js';

const router = express.Router();

// POST
router.post('/version', createNewLeiaVersion);
router.post('/', createLeia);

// GET
router.get('/exists/:name', existsLeiaByName);
router.get('/name/:name', getLeiasByName);
router.get('/name/:name/version/:version', getLeiaByNameAndVersion);
router.get('/', getLeiasByQuery);
router.get('/:id', getLeiaById);

export default router;
