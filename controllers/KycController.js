// controllers/KycController.js

import Customer from '../models/CustomerModel.js';
import {
   nibssInsertBvn,
   nibssValidateBvn,
   nibssInsertNin,
   nibssValidateNin
} from '../config/nibssService.js';

// ─── BVN ──────────────────────────────────────────────────────────────────

/**
 * POST /api/kyc/bvn/register
 * Register a BVN record in the NIBSS identity store and link it to this customer.
 * The customer must be logged in.
 */
export const registerBvn = async (req, res) => {
   try {
      const { bvn, firstName, lastName, dob, phone } = req.body;

      if (!bvn || !firstName || !lastName || !dob || !phone) {
         return res.status(400).json({
            message: 'Please provide: bvn, firstName, lastName, dob, phone'
         });
      }

      // Validate BVN is 11 digits
      if (!/^\d{11}$/.test(bvn)) {
         return res.status(400).json({ message: 'BVN must be an 11-digit number' });
      }

      const customer = await Customer.findById(req.customer.id);
      if (!customer) {
         return res.status(404).json({ message: 'Customer not found' });
      }

      // Check if customer already has KYC registered
      if (customer.kycRegistered) {
         return res.status(409).json({
            message: `Customer already has ${customer.kycType.toUpperCase()} registered. Cannot register another KYC identity.`
         });
      }

      // Check if this BVN is already used by another customer in our bank
      const existingKyc = await Customer.findOne({ kycID: bvn, kycType: 'bvn' });
      if (existingKyc) {
         return res.status(409).json({ message: 'This BVN is already registered to another customer' });
      }

      // Register BVN in NIBSS
      let nibssResponse;
      try {
         nibssResponse = await nibssInsertBvn({ bvn, firstName, lastName, dob, phone });
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         // If already registered in NIBSS, we can still link it — treat as OK
         if (nibssMsg && nibssMsg.toLowerCase().includes('already')) {
            nibssResponse = { message: 'BVN already exists in NIBSS — linking to your account', bvn };
         } else {
            return res.status(400).json({
               message: 'NIBSS BVN registration failed',
               error: nibssMsg
            });
         }
      }

      // Link BVN to customer
      customer.kycType = 'bvn';
      customer.kycID = bvn;
      customer.kycRegistered = true;
      await customer.save();

      res.status(201).json({
         message: 'BVN registered successfully. You can now create your bank account.',
         nibss: nibssResponse,
         customer: {
            id: customer._id,
            kycType: customer.kycType,
            kycID: customer.kycID,
            kycRegistered: customer.kycRegistered
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error registering BVN', error: error.message });
   }
};

/**
 * POST /api/kyc/bvn/validate
 * Validate a BVN against the NIBSS identity store
 */
export const validateBvn = async (req, res) => {
   try {
      const { bvn } = req.body;

      if (!bvn) {
         return res.status(400).json({ message: 'Please provide bvn' });
      }

      if (!/^\d{11}$/.test(bvn)) {
         return res.status(400).json({ message: 'BVN must be an 11-digit number' });
      }

      const result = await nibssValidateBvn(bvn);

      res.status(200).json({
         message: 'BVN validation successful',
         data: result
      });
   } catch (error) {
      const nibssMsg = error.response?.data?.message || error.message;
      res.status(400).json({ message: 'BVN validation failed', error: nibssMsg });
   }
};

// ─── NIN ──────────────────────────────────────────────────────────────────

/**
 * POST /api/kyc/nin/register
 * Register a NIN record in the NIBSS identity store and link it to this customer.
 */
export const registerNin = async (req, res) => {
   try {
      const { nin, firstName, lastName, dob } = req.body;

      if (!nin || !firstName || !lastName || !dob) {
         return res.status(400).json({
            message: 'Please provide: nin, firstName, lastName, dob'
         });
      }

      if (!/^\d{11}$/.test(nin)) {
         return res.status(400).json({ message: 'NIN must be an 11-digit number' });
      }

      const customer = await Customer.findById(req.customer.id);
      if (!customer) {
         return res.status(404).json({ message: 'Customer not found' });
      }

      if (customer.kycRegistered) {
         return res.status(409).json({
            message: `Customer already has ${customer.kycType.toUpperCase()} registered. Cannot register another KYC identity.`
         });
      }

      // Check if this NIN is already used by another customer
      const existingKyc = await Customer.findOne({ kycID: nin, kycType: 'nin' });
      if (existingKyc) {
         return res.status(409).json({ message: 'This NIN is already registered to another customer' });
      }

      // Register NIN in NIBSS
      let nibssResponse;
      try {
         nibssResponse = await nibssInsertNin({ nin, firstName, lastName, dob });
      } catch (nibssError) {
         const nibssMsg = nibssError.response?.data?.message || nibssError.message;
         if (nibssMsg && nibssMsg.toLowerCase().includes('already')) {
            nibssResponse = { message: 'NIN already exists in NIBSS — linking to your account', nin };
         } else {
            return res.status(400).json({
               message: 'NIBSS NIN registration failed',
               error: nibssMsg
            });
         }
      }

      // Link NIN to customer
      customer.kycType = 'nin';
      customer.kycID = nin;
      customer.kycRegistered = true;
      await customer.save();

      res.status(201).json({
         message: 'NIN registered successfully. You can now create your bank account.',
         nibss: nibssResponse,
         customer: {
            id: customer._id,
            kycType: customer.kycType,
            kycID: customer.kycID,
            kycRegistered: customer.kycRegistered
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error registering NIN', error: error.message });
   }
};

/**
 * POST /api/kyc/nin/validate
 * Validate a NIN against the NIBSS identity store
 */
export const validateNin = async (req, res) => {
   try {
      const { nin } = req.body;

      if (!nin) {
         return res.status(400).json({ message: 'Please provide nin' });
      }

      if (!/^\d{11}$/.test(nin)) {
         return res.status(400).json({ message: 'NIN must be an 11-digit number' });
      }

      const result = await nibssValidateNin(nin);

      res.status(200).json({
         message: 'NIN validation successful',
         data: result
      });
   } catch (error) {
      const nibssMsg = error.response?.data?.message || error.message;
      res.status(400).json({ message: 'NIN validation failed', error: nibssMsg });
   }
};
