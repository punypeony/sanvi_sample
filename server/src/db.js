import mongoose from 'mongoose';
import { config } from './config/index.js';

mongoose.set('strictQuery', true);

export function connectDb() {
  return mongoose.connect(config.mongoUri);
}

export function disconnectDb() {
  return mongoose.disconnect();
}

export function dbStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
