import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error conecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
