// models/AccountModel.js

import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
   {
      customerId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Customer',
         required: true,
         unique: true   // one account per customer
      },
      accountNumber: {
         type: String,
         required: true,
         unique: true,
         trim: true
      },
      accountName: {
         type: String,
         required: true
      },
      bankCode: {
         type: String,
         required: true
      },
      bankName: {
         type: String,
         required: true
      },
      balance: {
         type: Number,
         default: 15000
      },
      kycType: {
         type: String,
         enum: ['bvn', 'nin'],
         required: true
      },
      kycID: {
         type: String,
         required: true
      }
   },
   { timestamps: true }
);

const Account = mongoose.model('Account', accountSchema);

export default Account;
