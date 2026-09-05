// routes/accountRoutes.js

import express from 'express';
import {
   createAccount,
   getBalance,
   nameEnquiry,
   getMyAccount,
   getAllAccounts
} from '../controllers/AccountController.js';
import { protectedRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

// All account routes require authentication
router.use(protectedRoute);

// Customer routes
router.post('/create', createAccount);
router.get('/my-account', getMyAccount);
router.get('/balance', getBalance);
router.get('/name-enquiry/:accountNumber', nameEnquiry);

// Admin / listing route
router.get('/all', getAllAccounts);

export default router;
