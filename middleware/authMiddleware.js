// middleware/authMiddleware.js

import jwt from 'jsonwebtoken';

/**
 * Protects routes — verifies the local bank JWT issued at login.
 * Attaches decoded payload to req.customer.
 */
export const protectedRoute = async (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ message: 'Not authorized. No token provided.' });
      }

      const token = authHeader.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.customer = decoded;

      next();
   } catch (error) {
      if (error.name === 'TokenExpiredError') {
         return res.status(401).json({ message: 'Session expired. Please login again.' });
      }
      return res.status(401).json({ message: 'Not authorized. Invalid token.' });
   }
};
