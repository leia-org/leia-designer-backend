import express from 'express';
import { getAllModelsAndDetails } from '../../controllers/v1/providerController.js';
import { requireJwtAuthentication } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', requireJwtAuthentication, getAllModelsAndDetails);

export default router;
