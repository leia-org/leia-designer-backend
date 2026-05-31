import express from 'express';
import { createReplication, replicationNameExists } from '../../controllers/v1/workbenchController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/replications', requireJwtAuthentication, createReplication);
router.get('/replications/:name/exists', requireJwtAuthentication, replicationNameExists);
export default router;
