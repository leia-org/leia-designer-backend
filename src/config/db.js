import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import Leia from '../models/Leia.js';

const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    await Leia.syncIndexes();
    logger.info('Leia indexes synchronized');

    const admin = await User.exists({ role: 'admin' });
    if (!admin) {
      logger.warn('No admin user found. Creating one with default credentials...');
      // Create admin user
      const newAdmin = new User({
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
        role: 'admin',
      });
      await newAdmin.save();
      logger.info('Admin user created');
    } else {
      logger.info('Admin user found');
    }
  } catch (error) {
    logger.error(`Error conecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
