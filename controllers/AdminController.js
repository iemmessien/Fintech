// controllers/AdminController.js
// Admin-level operations: fintech onboarding with NIBSS, system status

import { nibssOnboard, getNibssToken } from '../config/nibssService.js';

/**
 * POST /api/admin/nibss/onboard
 * Register this bank (fintech) with NIBSS by Phoenix.
 * Should be called ONCE during setup. Returns apiKey, apiSecret, bankCode, bankName.
 * Store these in your .env file.
 */
export const onboardWithNibss = async (req, res) => {
   try {
      const { name, email } = req.body;

      if (!name || !email) {
         return res.status(400).json({ message: 'Please provide: name, email' });
      }

      let data;
      try {
         data = await nibssOnboard(name, email);
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         return res.status(400).json({
            message: 'NIBSS onboarding failed',
            error: nibssMsg
         });
      }

      res.status(201).json({
         message: 'Fintech onboarded with NIBSS successfully. Save the credentials below to your .env file.',
         instructions: {
            NIBSS_API_KEY: data.apiKey,
            NIBSS_API_SECRET: data.apiSecret,
            NIBSS_BANK_CODE: data.bankCode,
            NIBSS_BANK_NAME: data.bankName
         },
         raw: data
      });
   } catch (error) {
      res.status(500).json({ message: 'Error during NIBSS onboarding', error: error.message });
   }
};

/**
 * GET /api/admin/nibss/token-test
 * Test NIBSS authentication — confirms credentials are valid
 */
export const testNibssToken = async (req, res) => {
   try {
      const token = await getNibssToken();
      res.status(200).json({
         message: 'NIBSS authentication successful',
         tokenPreview: token.substring(0, 30) + '...'
      });
   } catch (error) {
      res.status(500).json({ message: 'NIBSS authentication failed', error: error.message });
   }
};

/**
 * GET /api/admin/health
 * Health check endpoint
 */
export const healthCheck = async (req, res) => {
   res.status(200).json({
      message: 'MyBank API is running',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      bank: {
         bankCode: process.env.NIBSS_BANK_CODE || 'NOT_SET',
         bankName: process.env.NIBSS_BANK_NAME || 'NOT_SET'
      }
   });
};
