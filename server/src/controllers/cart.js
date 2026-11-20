import { getCart, mergeCart, replaceCart } from '../services/cart.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const show = asyncHandler(async (req, res) => {
  res.json(await getCart(req.user._id));
});

export const replace = asyncHandler(async (req, res) => {
  res.json(await replaceCart(req.user._id, req.validated.body.lines));
});

export const merge = asyncHandler(async (req, res) => {
  res.json(await mergeCart(req.user._id, req.validated.body.lines));
});
