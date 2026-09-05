// models/TransactionModel.js

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
   {
      // The customer who initiated the transfer (sender)
      customerId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Customer',
         required: true
      },
      transactionId: {
         type: String,
         required: true,
         unique: true
      },
      type: {
         type: String,
         enum: ['debit', 'credit'],
         required: true
      },
      amount: {
         type: Number,
         required: true
      },
      fromAccount: {
         type: String,
         required: true
      },
      toAccount: {
         type: String,
         required: true
      },
      recipientName: {
         type: String,
         default: null
      },
      status: {
         type: String,
         enum: ['SUCCESS', 'PENDING', 'FAILED'],
         default: 'PENDING'
      },
      description: {
         type: String,
         default: ''
      },
      nibssTimestamp: {
         type: String,
         default: null
      }
   },
   { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
