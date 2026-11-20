import { z } from 'zod';
import { envelope } from './envelope.js';

const address = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(80),
  postal: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(80),
});

export const createSchema = envelope(z.object({
  email: z.string().trim().email().max(200),
  lines: z.array(z.object({
    productId: z.string().trim().min(1).max(80),
    colorId: z.string().trim().min(1).max(40),
    quantity: z.number().int().min(1).max(9),
  })).min(1).max(30),
  shippingAddress: address,
  outcome: z.enum(['success', 'decline']).optional(),
}));

export const lookupSchema = envelope(z.object({
  orderNumber: z.string().trim().min(4).max(40),
  email: z.string().trim().email().max(200),
}));
