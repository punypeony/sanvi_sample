import { z } from 'zod';
import { envelope } from './envelope.js';

export const linesSchema = z.array(z.object({
  productId: z.string().trim().min(1).max(80),
  colorId: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(1).max(9),
})).max(30);

export const linesBody = envelope(z.object({ lines: linesSchema }));
