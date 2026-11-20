import { z } from 'zod';
import { envelope } from './envelope.js';

const CATEGORIES = ['headphones', 'parts', 'accessories', 'bundles'];
const STATUSES = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

const colorway = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(1).max(40),
  price: z.number().min(0).max(100000),
  stockCount: z.number().int().min(0).max(100000),
});

const spec = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120),
});

export const productBody = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,60}$/),
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(200),
  price: z.number().min(0).max(100000),
  compareAtPrice: z.number().min(0).max(100000).nullable().optional(),
  category: z.enum(CATEGORIES),
  featured: z.boolean(),
  flagship: z.boolean(),
  active: z.boolean(),
  features: z.array(z.string().trim().min(1).max(120)).max(12),
  specs: z.array(spec).max(20).optional(),
  colorways: z.array(colorway).min(1).max(12).refine(
    (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
    { message: 'Color ids must be unique' },
  ),
});

export const createProductSchema = envelope(productBody);
export const productIdSchema = envelope(
  z.object({}).optional(),
  z.object({ id: z.string().trim().min(1).max(80) }),
);
export const updateProductSchema = envelope(productBody, z.object({ id: z.string() }));

export const orderListSchema = envelope(
  z.object({}).optional(),
  z.object({}).optional(),
  z.object({
    status: z.enum(STATUSES).optional(),
    q: z.string().trim().max(80).optional(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
);

export const orderNumberSchema = envelope(
  z.object({}).optional(),
  z.object({ orderNumber: z.string().trim().min(4).max(40) }),
);

export const orderStatusSchema = envelope(
  z.object({ status: z.enum(STATUSES) }),
  z.object({ orderNumber: z.string().min(1).max(40) }),
);

export const orderNoteSchema = envelope(
  z.object({ text: z.string().trim().min(1).max(500) }),
  z.object({ orderNumber: z.string().min(1).max(40) }),
);

export const customerQuerySchema = envelope(
  z.object({}).optional(),
  z.object({}).optional(),
  z.object({ q: z.string().trim().max(80).optional() }),
);

export const activeSchema = envelope(
  z.object({ isActive: z.boolean() }),
  z.object({ id: z.string().min(1) }),
);

export const roleSchema = envelope(
  z.object({ role: z.enum(['customer', 'admin']) }),
  z.object({ id: z.string().min(1) }),
);
