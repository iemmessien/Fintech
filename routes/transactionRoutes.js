// routes/transactionRoutes.js

import express from 'express';
import {
   initiateTransfer,
   getTransactionStatus,
   getTransactionHistory
} from '../controllers/TransactionController.js';
import { protectedRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

// All transaction routes require authentication
router.use(protectedRoute);

router.post('/transfer', initiateTransfer);
router.get('/history', getTransactionHistory);
router.get('/status/:transactionId', getTransactionStatus);

export default router;
