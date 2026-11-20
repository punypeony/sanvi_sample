import { HttpError } from '../utils/httpError.js';
import { Product } from '../models/Product.js';
import { escapeRegex } from '../utils/regex.js';
import { collectColors, toPublicProduct } from './catalog.js';

const sorts = {
  featured: { featured: -1, createdAt: 1 },
  'price-asc': { price: 1, name: 1 },
  'price-desc': { price: -1, name: 1 },
  rating: { rating: -1, reviewCount: -1, name: 1 },
};

export async function loadActive(slug) {
  const product = await Product.findOne({ slug, active: true });
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

export async function listProducts(query) {
  const filter = { active: true };
  if (query.category) filter.category = query.category;
  if (query.color) filter['colorways.id'] = query.color;
  let min = query.min;
  let max = query.max;
  if (min != null && max != null && min > max) {
    const swap = min;
    min = max;
    max = swap;
  }
  if (min != null || max != null) {
    filter.price = {};
    if (min != null) filter.price.$gte = min;
    if (max != null) filter.price.$lte = max;
  }
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: pattern }, { tagline: pattern }];
  }

  const pageSize = query.limit || 24;
  const total = await Product.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page || 1, pages);
  const products = await Product.find(filter)
    .sort(sorts[query.sort || 'featured'])
    .skip((page - 1) * pageSize)
    .limit(pageSize);
  const palette = await Product.find({ active: true }).select('colorways.id colorways.name');

  return {
    products: products.map(toPublicProduct),
    total,
    page,
    pages,
    pageSize,
    colors: collectColors(palette),
    placeholder: true,
  };
}

export async function getProduct(slug) {
  const product = await loadActive(slug);
  const related = await Product.find({ id: { $in: product.relatedIds }, active: true });
  const fits = await Product.find({ id: { $in: product.fitsIds }, active: true });
  const order = (ids, docs) => ids.map((id) => docs.find((doc) => doc.id === id)).filter(Boolean);
  return {
    product: toPublicProduct(product),
    related: order(product.relatedIds, related).map(toPublicProduct),
    fits: order(product.fitsIds, fits).map(toPublicProduct),
  };
}
