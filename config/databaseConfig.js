// config/databaseConfig.js

import mongoose from 'mongoose';

const connectDB = async () => {
   try {
      const mongodbUri = process.env.MONGODB_URI;

      if (!mongodbUri) {
         throw new Error('MONGODB_URI not found in environment variables');
      }

      const conn = await mongoose.connect(mongodbUri);
      console.log(`MongoDB connected: ${conn.connection.host}`);
   } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
      process.exit(1);
   }
};

export default connectDB;
