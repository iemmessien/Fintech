// controllers/AccountController.js

import Customer from '../models/CustomerModel.js';
import Account from '../models/AccountModel.js';
import {
   nibssCreateAccount,
   nibssGetBalance,
   nibssNameEnquiry,
   nibssGetAllAccounts
} from '../config/nibssService.js';

/**
 * POST /api/account/create
 * Create a bank account for the authenticated customer via NIBSS.
 * Requirements:
 *   - Customer must have completed KYC (BVN or NIN registered)
 *   - Customer can only have ONE account
 */
export const createAccount = async (req, res) => {
   try {
      const customer = await Customer.findById(req.customer.id);
      if (!customer) {
         return res.status(404).json({ message: 'Customer not found' });
      }

      // Enforce KYC requirement
      if (!customer.kycRegistered || !customer.kycID || !customer.kycType) {
         return res.status(403).json({
            message: 'Account creation requires completed KYC. Please register your BVN or NIN first via POST /api/kyc/bvn/register or POST /api/kyc/nin/register'
         });
      }

      // Enforce one account per customer
      if (customer.accountCreated) {
         const existingAccount = await Account.findOne({ customerId: customer._id });
         if (existingAccount) {
            return res.status(409).json({
               message: 'You already have an account with MyBank',
               account: {
                  accountNumber: existingAccount.accountNumber,
                  accountName: existingAccount.accountName,
                  bankCode: existingAccount.bankCode,
                  bankName: existingAccount.bankName
               }
            });
         }
      }

      // Call NIBSS to create account
      let nibssData;
      try {
         nibssData = await nibssCreateAccount({
            kycType: customer.kycType,
            kycID: customer.kycID,
            dob: customer.dob
         });
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         return res.status(400).json({
            message: 'NIBSS account creation failed',
            error: nibssMsg
         });
      }

      // Persist account locally
      const account = new Account({
         customerId: customer._id,
         accountNumber: nibssData.accountNumber,
         accountName: `${customer.firstName} ${customer.lastName}`,
         bankCode: nibssData.bankCode || process.env.NIBSS_BANK_CODE,
         bankName: nibssData.bankName || process.env.NIBSS_BANK_NAME,
         balance: nibssData.balance || 15000,
         kycType: customer.kycType,
         kycID: customer.kycID
      });

      await account.save();

      // Mark customer as having an account
      customer.accountCreated = true;
      await customer.save();

      res.status(201).json({
         message: 'Bank account created successfully',
         account: {
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            bankCode: account.bankCode,
            bankName: account.bankName,
            balance: account.balance
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error creating account', error: error.message });
   }
};

/**
 * GET /api/account/balance
 * Get the authenticated customer's account balance (from NIBSS)
 */
export const getBalance = async (req, res) => {
   try {
      const account = await Account.findOne({ customerId: req.customer.id });
      if (!account) {
         return res.status(404).json({
            message: 'No account found. Please create an account first.'
         });
      }

      // Fetch live balance from NIBSS
      let nibssData;
      try {
         nibssData = await nibssGetBalance(account.accountNumber);
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         return res.status(400).json({ message: 'Failed to fetch balance from NIBSS', error: nibssMsg });
      }

      // Sync local balance
      account.balance = nibssData.balance;
      await account.save();

      res.status(200).json({
         message: 'Account balance retrieved successfully',
         accountNumber: account.accountNumber,
         accountName: account.accountName,
         balance: nibssData.balance,
         bankName: account.bankName
      });
   } catch (error) {
      res.status(500).json({ message: 'Error fetching balance', error: error.message });
   }
};

/**
 * GET /api/account/name-enquiry/:accountNumber
 * Resolve any account number to holder name via NIBSS
 * Authenticated customers can look up any account
 */
export const nameEnquiry = async (req, res) => {
   try {
      const { accountNumber } = req.params;

      if (!accountNumber || accountNumber.length !== 10) {
         return res.status(400).json({ message: 'Please provide a valid 10-digit account number' });
      }

      let data;
      try {
         data = await nibssNameEnquiry(accountNumber);
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         return res.status(404).json({ message: 'Account not found or name enquiry failed', error: nibssMsg });
      }

      res.status(200).json({
         message: 'Name enquiry successful',
         accountNumber: data.accountNumber,
         accountName: data.accountName,
         bankName: data.bankName
      });
   } catch (error) {
      res.status(500).json({ message: 'Error performing name enquiry', error: error.message });
   }
};

/**
 * GET /api/account/my-account
 * Get the authenticated customer's account details (local DB)
 */
export const getMyAccount = async (req, res) => {
   try {
      const account = await Account.findOne({ customerId: req.customer.id }).select('-kycID');
      if (!account) {
         return res.status(404).json({
            message: 'No account found. Please create an account first.'
         });
      }

      // Fetch fresh balance from NIBSS
      try {
         const nibssData = await nibssGetBalance(account.accountNumber);
         account.balance = nibssData.balance;
         await account.save();
      } catch (_) {
         // If NIBSS fetch fails, return cached balance
      }

      res.status(200).json({
         message: 'Account details retrieved successfully',
         account: {
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            bankCode: account.bankCode,
            bankName: account.bankName,
            balance: account.balance,
            createdAt: account.createdAt
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error retrieving account', error: error.message });
   }
};

/**
 * GET /api/account/all  (Admin — lists all accounts under our bank from NIBSS)
 */
export const getAllAccounts = async (req, res) => {
   try {
      let nibssData;
      try {
         nibssData = await nibssGetAllAccounts();
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         return res.status(400).json({ message: 'Failed to fetch accounts from NIBSS', error: nibssMsg });
      }

      res.status(200).json({
         message: 'All accounts retrieved successfully',
         accounts: nibssData.accounts || nibssData
      });
   } catch (error) {
      res.status(500).json({ message: 'Error retrieving accounts', error: error.message });
   }
};
