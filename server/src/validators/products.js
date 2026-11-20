import { z } from 'zod';
import { envelope } from './envelope.js';

const blankToUndefined = (value) => (value == null || value === '' ? undefined : value);

export const listQuery = z.object({
  category: z.preprocess(blankToUndefined, z.enum(['headphones', 'parts', 'accessories', 'bundles']).optional()),
  color: z.preprocess(blankToUndefined, z.string().trim().regex(/^[a-z0-9-]{1,40}$/).optional()),
  min: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100000).optional()),
  max: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100000).optional()),
  sort: z.preprocess(blankToUndefined, z.enum(['featured', 'price-asc', 'price-desc', 'rating']).optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(1000).optional()),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(48).optional()),
});

export const slugParams = z.object({ slug: z.string().trim().min(1).max(80) });

export const listSchema = envelope(z.object({}).optional(), z.object({}).optional(), listQuery);
export const slugSchema = envelope(z.object({}).optional(), slugParams);
