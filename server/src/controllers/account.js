import { attachOrders, updateProfile } from '../services/account.js';
import { getOwnedOrder, listOrdersForUser } from '../services/orders.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const update = asyncHandler(async (req, res) => {
  res.json(await updateProfile(req.user, req.validated.body));
});

export const listOrders = asyncHandler(async (req, res) => {
  res.json(await listOrdersForUser(req.user._id));
});

export const attach = asyncHandler(async (req, res) => {
  res.json(await attachOrders(req.user));
});

export const showOrder = asyncHandler(async (req, res) => {
  res.json(await getOwnedOrder(req.user, req.validated.params.orderNumber));
});
