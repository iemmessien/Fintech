// controllers/AuthController.js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Customer from '../models/CustomerModel.js';

/**
 * POST /api/auth/register
 * Register a new bank customer (onboarding — Step 1)
 * Does NOT create NIBSS account yet; that requires KYC registration first.
 */
export const registerCustomer = async (req, res) => {
   try {
      const { firstName, lastName, email, password, phone, dob } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !phone || !dob) {
         return res.status(400).json({
            message: 'Please provide all required fields: firstName, lastName, email, password, phone, dob'
         });
      }

      // Check existing email
      const existingEmail = await Customer.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
         return res.status(409).json({ message: 'A customer with this email already exists' });
      }

      // Check existing phone
      const existingPhone = await Customer.findOne({ phone });
      if (existingPhone) {
         return res.status(409).json({ message: 'A customer with this phone number already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create customer
      const customer = new Customer({
         firstName: firstName.trim(),
         lastName: lastName.trim(),
         email: email.toLowerCase().trim(),
         password: hashedPassword,
         phone: phone.trim(),
         dob: dob.trim()
      });

      await customer.save();

      res.status(201).json({
         message: 'Customer registered successfully. Please register your BVN or NIN to proceed to account creation.',
         customer: {
            id: customer._id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            dob: customer.dob,
            kycRegistered: customer.kycRegistered,
            accountCreated: customer.accountCreated
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error registering customer', error: error.message });
   }
};

/**
 * POST /api/auth/login
 * Authenticate a bank customer and return a local JWT
 */
export const loginCustomer = async (req, res) => {
   try {
      const { email, password } = req.body;

      if (!email || !password) {
         return res.status(400).json({ message: 'Please provide email and password' });
      }

      const customer = await Customer.findOne({ email: email.toLowerCase() });
      if (!customer) {
         return res.status(404).json({ message: 'Customer not found' });
      }

      const passwordMatch = await bcrypt.compare(password, customer.password);
      if (!passwordMatch) {
         return res.status(401).json({ message: 'Incorrect password' });
      }

      // Sign local JWT
      const token = jwt.sign(
         {
            id: customer._id,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName
         },
         process.env.JWT_SECRET,
         { expiresIn: '24h' }
      );

      res.status(200).json({
         message: 'Login successful',
         token,
         customer: {
            id: customer._id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            kycType: customer.kycType,
            kycRegistered: customer.kycRegistered,
            accountCreated: customer.accountCreated
         }
      });
   } catch (error) {
      res.status(500).json({ message: 'Error logging in', error: error.message });
   }
};

/**
 * GET /api/auth/me
 * Get the currently authenticated customer's profile
 */
export const getProfile = async (req, res) => {
   try {
      const customer = await Customer.findById(req.customer.id).select('-password');
      if (!customer) {
         return res.status(404).json({ message: 'Customer not found' });
      }

      res.status(200).json({ message: 'Profile retrieved successfully', customer });
   } catch (error) {
      res.status(500).json({ message: 'Error retrieving profile', error: error.message });
   }
};
