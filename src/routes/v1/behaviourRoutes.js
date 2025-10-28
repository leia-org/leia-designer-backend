import express from 'express';
import {
  createBehaviour,
  createNewBehaviourVersion,
  getBehaviourById,
  existsBehaviourByName,
  getBehavioursByQuery,
  getBehaviourByNameAndVersion,
  getBehavioursByName,
  deleteBehaviourById
} from '../../controllers/v1/behaviourController.js';
import { requireAdvanced, requireAuthentication, requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

// POST
router.post('/version', requireAdvanced, createNewBehaviourVersion);
router.post('/', requireAdvanced, createBehaviour);

// GET
router.get('/exists/:name', requireAuthentication, existsBehaviourByName);
router.get('/name/:name', requireAuthentication, getBehavioursByName);
router.get('/name/:name/version/:version', requireAuthentication, getBehaviourByNameAndVersion);
router.get('/', requireAuthentication, getBehavioursByQuery);
router.get('/:id', requireAuthentication, getBehaviourById);

// DELETE
router.delete('/:id', requireJwtAuthentication, deleteBehaviourById);

export default router;
