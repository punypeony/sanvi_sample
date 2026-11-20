import { getProduct, listProducts } from '../services/products.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await listProducts(req.validated.query));
});

export const detail = asyncHandler(async (req, res) => {
  res.json(await getProduct(req.validated.params.slug));
});
