import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(root, '.env') });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.`);
  return value;
}

function number(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a positive number`);
  return value;
}

const sessionSecret = required('SESSION_SECRET');
if (sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: number('PORT', 4000),
  mongoUri: required('MONGODB_URI'),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionSecret,
  rateLimitWindowMs: number('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  rateLimitMax: number('RATE_LIMIT_MAX', 300),
  authRateLimitMax: number('AUTH_RATE_LIMIT_MAX', 10),
};
