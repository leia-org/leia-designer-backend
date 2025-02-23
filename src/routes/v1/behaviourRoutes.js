import express from 'express';
import {
  createBehaviour,
  createNewBehaviourVersion,
  getBehaviourById,
  existsBehaviourByName,
  getBehavioursByQuery,
  getBehaviourByNameAndVersion,
  getBehavioursByName,
} from '../../controllers/v1/behaviourController.js';

const router = express.Router();

// POST
router.post('/version', createNewBehaviourVersion);
router.post('/', createBehaviour);

// GET
router.get('/exists/:name', existsBehaviourByName);
router.get('/name/:name', getBehavioursByName);
router.get('/name/:name/version/:version', getBehaviourByNameAndVersion);
router.get('/', getBehavioursByQuery);
router.get('/:id', getBehaviourById);

export default router;
