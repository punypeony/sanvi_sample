import { z } from 'zod';
import { envelope } from './envelope.js';

const address = z.object({
  label: z.string().trim().min(1).max(40),
  line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(80),
  postal: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(80),
});

export const profileSchema = envelope(z.object({
  name: z.string().trim().min(1).max(120),
  addresses: z.array(address).max(5),
}));

export const emptyBody = envelope(z.object({}).strict());

export const orderNumberSchema = envelope(
  z.object({}).optional(),
  z.object({ orderNumber: z.string().trim().min(4).max(40) }),
);
