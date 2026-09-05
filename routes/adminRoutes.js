// routes/adminRoutes.js

import express from 'express';
import { onboardWithNibss, testNibssToken, healthCheck } from '../controllers/AdminController.js';

const router = express.Router();

// Public — health check
router.get('/health', healthCheck);

// NIBSS setup endpoints (no auth needed during initial setup)
router.post('/nibss/onboard', onboardWithNibss);
router.get('/nibss/token-test', testNibssToken);

export default router;
