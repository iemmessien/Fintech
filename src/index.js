// src/index.js — MyBank Digital Banking System

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import connectDB from '../config/databaseConfig.js';

import authRoutes from '../routes/authRoutes.js';
import kycRoutes from '../routes/kycRoutes.js';
import accountRoutes from '../routes/accountRoutes.js';
import transactionRoutes from '../routes/transactionRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/admin', adminRoutes);

// ─── Root ───
app.get('/', (req, res) => {
   res.json({
      message: 'Welcome to FIN Bank Nova API',
      version: '1.0.0',
      bank: {
         bankCode: process.env.NIBSS_BANK_CODE,
         bankName: process.env.NIBSS_BANK_NAME
      },
      endpoints: {
         health: 'GET /api/admin/health',
         nibssOnboard: 'POST /api/admin/nibss/onboard',
         register: 'POST /api/auth/register',
         login: 'POST /api/auth/login',
         profile: 'GET /api/auth/me',
         registerBvn: 'POST /api/kyc/bvn/register',
         validateBvn: 'POST /api/kyc/bvn/validate',
         registerNin: 'POST /api/kyc/nin/register',
         validateNin: 'POST /api/kyc/nin/validate',
         createAccount: 'POST /api/account/create',
         myAccount: 'GET /api/account/my-account',
         balance: 'GET /api/account/balance',
         nameEnquiry: 'GET /api/account/name-enquiry/:accountNumber',
         allAccounts: 'GET /api/account/all',
         transfer: 'POST /api/transaction/transfer',
         txHistory: 'GET /api/transaction/history',
         txStatus: 'GET /api/transaction/status/:transactionId'
      }
   });
});

// ─── 404 Handler ───
app.use((req, res) => {
   res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
   console.error('Unhandled error:', err);
   res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ─── Start Server ───
app.listen(PORT, async () => {
   console.log(`\n🏦  FIN Bank Nova API running on port ${PORT}`);
   console.log(`📡  Bank: ${process.env.NIBSS_BANK_NAME || 'MyBank'} (${process.env.NIBSS_BANK_CODE || 'UNCONFIGURED'})`);
   console.log(`🔗  NIBSS: ${process.env.NIBSS_BASE_URL || 'https://nibssbyphoenix.onrender.com'}\n`);
   await connectDB();
});

export default app;
