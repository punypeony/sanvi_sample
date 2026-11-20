import { z } from 'zod';
import { envelope } from './envelope.js';

export const loginSchema = envelope(z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
}));

export const registerSchema = envelope(z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(12).max(200),
}));

export const passwordSchema = envelope(z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(12).max(200),
}));

export const emailSchema = envelope(z.object({
  email: z.string().trim().email().max(200),
}));

export const resetSchema = envelope(z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(12).max(200),
}));
