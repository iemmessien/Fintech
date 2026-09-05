// routes/authRoutes.js

import express from 'express';
import { registerCustomer, loginCustomer, getProfile } from '../controllers/AuthController.js';
import { protectedRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerCustomer);
router.post('/login', loginCustomer);

// Protected routes
router.get('/me', protectedRoute, getProfile);

export default router;
