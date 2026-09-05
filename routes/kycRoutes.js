// routes/kycRoutes.js

import express from 'express';
import {
   registerBvn,
   validateBvn,
   registerNin,
   validateNin
} from '../controllers/KycController.js';
import { protectedRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

// All KYC routes require authentication
router.use(protectedRoute);

// BVN
router.post('/bvn/register', registerBvn);
router.post('/bvn/validate', validateBvn);

// NIN
router.post('/nin/register', registerNin);
router.post('/nin/validate', validateNin);

export default router;
