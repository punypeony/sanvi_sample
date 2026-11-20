import { lookupOrder, placeOrder } from '../services/orders.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
  const { order, created } = await placeOrder({
    user: req.user,
    idempotencyKey: req.get('idempotency-key') || '',
    ...req.validated.body,
  });
  res.status(created ? 201 : 200).json(order);
});

export const lookup = asyncHandler(async (req, res) => {
  res.json(await lookupOrder(req.validated.body));
});
