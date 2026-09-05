// models/CustomerModel.js

import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
   {
      firstName: {
         type: String,
         required: true,
         trim: true
      },
      lastName: {
         type: String,
         required: true,
         trim: true
      },
      email: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true
      },
      password: {
         type: String,
         required: true
      },
      phone: {
         type: String,
         required: true,
         unique: true,
         trim: true
      },
      dob: {
         type: String,
         required: true   // YYYY-MM-DD format
      },
      // KYC identity: either BVN or NIN
      kycType: {
         type: String,
         enum: ['bvn', 'nin'],
         default: null
      },
      kycID: {
         type: String,
         default: null,
         unique: true,
         sparse: true   // allows multiple nulls
      },
      // Tracks whether KYC was registered in NIBSS
      kycRegistered: {
         type: Boolean,
         default: false
      },
      // Tracks whether NIBSS account has been created
      accountCreated: {
         type: Boolean,
         default: false
      }
   },
   { timestamps: true }
);

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
