import {
  addOrderNote,
  addProductImage,
  createProduct,
  dashboard,
  getCustomer,
  getOrder,
  getProduct,
  listAudit,
  listCustomers,
  listOrders,
  listProducts,
  removeProductImage,
  setCustomerActive,
  setCustomerRole,
  setOrderStatus,
  updateProduct,
} from '../services/admin.js';
import { listAdminReviews, setReviewStatus } from '../services/reviews.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const showDashboard = asyncHandler(async (_req, res) => {
  res.json(await dashboard());
});

export const showProducts = asyncHandler(async (_req, res) => {
  res.json(await listProducts());
});

export const showProduct = asyncHandler(async (req, res) => {
  res.json(await getProduct(req.validated.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const product = await createProduct(req.validated.body, req.user._id);
  res.status(201).json({ product });
});

export const update = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.id, req.validated.body, req.user._id);
  res.json({ product });
});

export const uploadImage = asyncHandler(async (req, res) => {
  const product = await addProductImage({
    id: req.params.id,
    buffer: req.file?.buffer,
    actorId: req.user._id,
  });
  res.status(201).json({ product });
});

export const deleteImage = asyncHandler(async (req, res) => {
  const product = await removeProductImage({
    id: req.params.id,
    imageId: req.params.imageId,
    actorId: req.user._id,
  });
  res.json({ product });
});

export const showOrders = asyncHandler(async (req, res) => {
  res.json(await listOrders(req.validated.query));
});

export const showOrder = asyncHandler(async (req, res) => {
  res.json(await getOrder(req.validated.params.orderNumber));
});

export const updateOrder = asyncHandler(async (req, res) => {
  res.json(await setOrderStatus(req.params.orderNumber, req.validated.body.status, req.user));
});

export const createNote = asyncHandler(async (req, res) => {
  const order = await addOrderNote({
    orderNumber: req.params.orderNumber,
    text: req.validated.body.text,
    actor: req.user,
  });
  res.status(201).json({ order });
});

export const showCustomers = asyncHandler(async (req, res) => {
  res.json(await listCustomers(req.validated.query.q));
});

export const showCustomer = asyncHandler(async (req, res) => {
  res.json(await getCustomer(req.params.id));
});

export const updateCustomer = asyncHandler(async (req, res) => {
  res.json(await setCustomerActive({
    id: req.params.id,
    isActive: req.validated.body.isActive,
    actorId: req.user._id,
  }));
});

export const updateRole = asyncHandler(async (req, res) => {
  res.json(await setCustomerRole({
    id: req.params.id,
    role: req.validated.body.role,
    actorId: req.user._id,
  }));
});

export const showReviews = asyncHandler(async (req, res) => {
  res.json(await listAdminReviews(req.validated.query.status));
});

export const updateReview = asyncHandler(async (req, res) => {
  res.json(await setReviewStatus({
    id: req.params.id,
    status: req.validated.body.status,
    actorId: req.user._id,
  }));
});

export const showAudit = asyncHandler(async (_req, res) => {
  res.json(await listAudit());
});
