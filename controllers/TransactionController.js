// controllers/TransactionController.js

import Customer from '../models/CustomerModel.js';
import Account from '../models/AccountModel.js';
import Transaction from '../models/TransactionModel.js';
import { nibssTransfer, nibssGetTransaction, nibssNameEnquiry, nibssGetBalance } from '../config/nibssService.js';
import { sendTransactionEmail } from '../middleware/emailSenderMiddleware.js';

/**
 * POST /api/transaction/transfer
 * Initiate a fund transfer (intra-bank or inter-bank) via NIBSS
 * Flow:
 *   1. Verify sender has an account
 *   2. Name enquiry on recipient
 *   3. Execute transfer via NIBSS
 *   4. Log transaction locally
 *   5. Send email confirmation to sender
 */
export const initiateTransfer = async (req, res) => {
   try {
      const { toAccount, amount, description } = req.body;

      if (!toAccount || !amount) {
         return res.status(400).json({ message: 'Please provide: toAccount, amount' });
      }

      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
         return res.status(400).json({ message: 'Amount must be a positive number' });
      }

      // Get sender's account
      const senderAccount = await Account.findOne({ customerId: req.customer.id });
      if (!senderAccount) {
         return res.status(404).json({
            message: 'You do not have an account. Please create one first.'
         });
      }

      // Prevent transfer to same account
      if (senderAccount.accountNumber === toAccount) {
         return res.status(400).json({ message: 'Cannot transfer to your own account' });
      }

      // Step 1: Name enquiry on recipient
      let recipientName = 'Unknown';
      let recipientBankName = 'Unknown Bank';
      try {
         const enquiry = await nibssNameEnquiry(toAccount);
         recipientName = enquiry.accountName;
         recipientBankName = enquiry.bankName;
      } catch (e) {
         return res.status(404).json({
            message: `Recipient account ${toAccount} not found. Please verify the account number.`
         });
      }

      // Step 2: Execute transfer via NIBSS
      let nibssData;
      try {
         nibssData = await nibssTransfer({
            from: senderAccount.accountNumber,
            to: toAccount,
            amount: String(parsedAmount)
         });
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         return res.status(400).json({
            message: 'Transfer failed',
            error: nibssMsg
         });
      }

      // Step 3: Log transaction locally (debit)
      const transaction = new Transaction({
         customerId: req.customer.id,
         transactionId: nibssData.transactionId,
         type: 'debit',
         amount: parsedAmount,
         fromAccount: senderAccount.accountNumber,
         toAccount,
         recipientName,
         status: nibssData.status || 'SUCCESS',
         description: description || `Transfer to ${recipientName}`,
         nibssTimestamp: nibssData.timestamp || new Date().toISOString()
      });
      await transaction.save();

      // Step 4: If recipient is also in our bank, log credit transaction too
      const recipientAccount = await Account.findOne({ accountNumber: toAccount });
      if (recipientAccount) {
         const creditTx = new Transaction({
            customerId: recipientAccount.customerId,
            transactionId: nibssData.transactionId + '_CR',
            type: 'credit',
            amount: parsedAmount,
            fromAccount: senderAccount.accountNumber,
            toAccount,
            recipientName: `${req.customer.firstName} ${req.customer.lastName}`,
            status: nibssData.status || 'SUCCESS',
            description: description || `Transfer from ${senderAccount.accountName}`,
            nibssTimestamp: nibssData.timestamp || new Date().toISOString()
         });
         await creditTx.save();
      }

      // Step 5: Sync sender's local balance
      try {
         const balData = await nibssGetBalance(senderAccount.accountNumber);
         senderAccount.balance = balData.balance;
         await senderAccount.save();
      } catch (_) { /* non-fatal */ }

      // Step 6: Send email confirmation to sender
      const customer = await Customer.findById(req.customer.id);
      if (customer) {
         await sendTransactionEmail({
            toEmail: customer.email,
            customerName: `${customer.firstName} ${customer.lastName}`,
            transactionId: nibssData.transactionId,
            amount: parsedAmount,
            fromAccount: senderAccount.accountNumber,
            toAccount,
            recipientName,
            status: nibssData.status || 'SUCCESS',
            timestamp: nibssData.timestamp || new Date().toISOString()
         });
      }

      res.status(200).json({
         message: 'Transfer successful',
         transaction: {
            transactionId: nibssData.transactionId,
            amount: parsedAmount,
            from: senderAccount.accountNumber,
            to: toAccount,
            recipientName,
            recipientBank: recipientBankName,
            status: nibssData.status || 'SUCCESS',
            timestamp: nibssData.timestamp || new Date().toISOString()
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error processing transfer', error: error.message });
   }
};

/**
 * GET /api/transaction/status/:transactionId
 * Query transaction status from NIBSS (TSQ)
 * Customer can only query their own transactions
 */
export const getTransactionStatus = async (req, res) => {
   try {
      const { transactionId } = req.params;

      if (!transactionId) {
         return res.status(400).json({ message: 'Please provide a transactionId' });
      }

      // Data privacy: verify this transaction belongs to the caller
      const baseTransactionId = transactionId.replace('_CR', '');
      const localTx = await Transaction.findOne({
         transactionId: { $in: [transactionId, baseTransactionId, baseTransactionId + '_CR'] },
         customerId: req.customer.id
      });

      if (!localTx) {
         return res.status(403).json({
            message: 'Transaction not found or you do not have permission to view it'
         });
      }

      // Fetch fresh status from NIBSS
      let nibssData;
      try {
         nibssData = await nibssGetTransaction(baseTransactionId);
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         // Return local record if NIBSS fetch fails
         return res.status(200).json({
            message: 'Transaction status retrieved (from local records)',
            transaction: {
               transactionId: localTx.transactionId,
               status: localTx.status,
               amount: localTx.amount,
               from: localTx.fromAccount,
               to: localTx.toAccount,
               recipientName: localTx.recipientName,
               timestamp: localTx.nibssTimestamp || localTx.createdAt
            }
         });
      }

      // Update local record with fresh NIBSS status
      localTx.status = nibssData.status;
      localTx.nibssTimestamp = nibssData.timestamp;
      await localTx.save();

      res.status(200).json({
         message: 'Transaction status retrieved successfully',
         transaction: {
            transactionId: nibssData.transactionId,
            status: nibssData.status,
            amount: nibssData.amount,
            from: nibssData.from,
            to: nibssData.to,
            timestamp: nibssData.timestamp
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error fetching transaction status', error: error.message });
   }
};

/**
 * GET /api/transaction/history
 * Get the authenticated customer's own transaction history
 * Strict data isolation — only returns this customer's transactions
 */
export const getTransactionHistory = async (req, res) => {
   try {
      const { page = 1, limit = 20, type } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const filter = { customerId: req.customer.id };
      if (type && ['debit', 'credit'].includes(type)) {
         filter.type = type;
      }

      const [transactions, total] = await Promise.all([
         Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .select('-customerId -__v'),
         Transaction.countDocuments(filter)
      ]);

      res.status(200).json({
         message: 'Transaction history retrieved successfully',
         pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit))
         },
         transactions
      });
   } catch (error) {
      res.status(500).json({ message: 'Error fetching transaction history', error: error.message });
   }
};
