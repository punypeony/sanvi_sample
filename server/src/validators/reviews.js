import { z } from 'zod';
import { envelope } from './envelope.js';
import { slugParams } from './products.js';

export const listSchema = envelope(z.object({}).optional(), slugParams);

export const createSchema = envelope(z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000),
  colorway: z.string().trim().max(40).optional(),
}), slugParams);

export const moderateSchema = envelope(
  z.object({ status: z.enum(['pending', 'approved', 'rejected']) }),
  z.object({ id: z.string().min(1).max(40) }),
);

export const adminListSchema = envelope(
  z.object({}).optional(),
  z.object({}).optional(),
  z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }),
);
