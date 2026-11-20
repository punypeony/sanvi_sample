import mongoose from 'mongoose';
import { HttpError } from '../utils/httpError.js';
import { AuditLog } from '../models/AuditLog.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { removeImage, saveImage } from '../providers/storage.js';
import { escapeRegex } from '../utils/regex.js';
import { publicUser } from './auth.js';
import { recordAudit } from './audit.js';
import { changeOrderStatus, TRANSITIONS } from './orderStatus.js';

const LOW_STOCK_AT = 5;
const OPEN_STATUSES = ['paid', 'packed', 'shipped', 'delivered'];
const STATUSES = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

function knownUserId(id) {
  if (mongoose.isValidObjectId(id)) return;
  throw new HttpError(404, 'Customer not found.');
}

function stockSummary(product) {
  return (product.colorways || []).map((item) => `${item.id}:${item.stockCount}`).join(',');
}

async function keepOneFlagship(product) {
  if (!product.flagship) return;
  await Product.updateMany({ id: { $ne: product.id } }, { $set: { flagship: false } });
}

function applyProduct(doc, body, { creating }) {
  doc.id = body.id;
  doc.slug = body.slug;
  doc.name = body.name;
  doc.tagline = body.tagline;
  doc.price = body.price;
  doc.compareAtPrice = body.compareAtPrice ?? undefined;
  doc.category = body.category;
  doc.featured = body.featured;
  doc.flagship = body.flagship;
  doc.active = body.active;
  doc.features = body.features;
  doc.specs = body.specs ?? doc.specs ?? [];
  doc.colorways = body.colorways;
  if (creating) {
    doc.placeholder = false;
    doc.rating = 0;
    doc.reviewCount = 0;
    doc.images = [];
    doc.relatedIds = [];
    doc.fitsIds = [];
  }
}

async function assertNotLastAdmin(user) {
  if (user.role !== 'admin' || !user.isActive) return;
  const admins = await User.countDocuments({ role: 'admin', isActive: true });
  if (admins <= 1) throw new HttpError(409, 'The last admin cannot be demoted or deactivated.');
}

export async function dashboard() {
  const [orders, products, pendingReviews] = await Promise.all([
    Order.find().lean(),
    Product.find({ active: true }).lean(),
    Review.countDocuments({ status: 'pending' }),
  ]);
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  let revenue = 0;
  for (const order of orders) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    if (OPEN_STATUSES.includes(order.status)) revenue += order.total;
  }
  const lowStock = [];
  for (const product of products) {
    for (const colorway of product.colorways) {
      if (colorway.stockCount <= LOW_STOCK_AT) {
        lowStock.push({
          productId: product.id,
          name: product.name,
          colorId: colorway.id,
          colorName: colorway.name,
          stockCount: colorway.stockCount,
        });
      }
    }
  }
  const recent = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)
    .map((order) => ({
      orderNumber: order.orderNumber,
      email: order.email,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    }));
  const flagshipCount = await Product.countDocuments({ flagship: true, active: true });
  return {
    placeholder: true,
    revenue,
    orderCount: orders.length,
    pendingReviews,
    flagshipCount,
    byStatus,
    lowStock,
    recent,
  };
}

export async function listProducts() {
  const products = await Product.find().sort({ name: 1 }).lean();
  return { products };
}

export async function getProduct(id) {
  const product = await Product.findOne({ id }).lean();
  if (!product) throw new HttpError(404, 'Product not found.');
  return { product };
}

export async function createProduct(body, actorId) {
  try {
    const doc = new Product();
    applyProduct(doc, body, { creating: true });
    await doc.save();
    await keepOneFlagship(doc);
    await recordAudit({
      actorId,
      action: 'product.create',
      target: doc.id,
      after: `active=${doc.active} flagship=${doc.flagship} price=${doc.price}`,
    });
    return doc.toObject();
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'A product with that id or slug already exists.');
    throw error;
  }
}

export async function updateProduct(id, body, actorId) {
  const doc = await Product.findOne({ id });
  if (!doc) throw new HttpError(404, 'Product not found.');
  if (body.id !== doc.id) throw new HttpError(400, 'The product id stays as it is.');
  const before = `active=${doc.active} flagship=${doc.flagship} price=${doc.price}`;
  const beforeStock = stockSummary(doc);
  applyProduct(doc, body, { creating: false });
  try {
    await doc.save();
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'A product with that slug already exists.');
    throw error;
  }
  await keepOneFlagship(doc);
  await recordAudit({
    actorId,
    action: 'product.update',
    target: doc.id,
    before,
    after: `active=${doc.active} flagship=${doc.flagship} price=${doc.price}`,
  });
  const afterStock = stockSummary(doc);
  if (beforeStock !== afterStock) {
    await recordAudit({
      actorId,
      action: 'product.stock',
      target: doc.id,
      before: beforeStock,
      after: afterStock,
    });
  }
  return doc.toObject();
}

export async function addProductImage({ id, buffer, actorId }) {
  const doc = await Product.findOne({ id });
  if (!doc) throw new HttpError(404, 'Product not found.');
  if (!buffer) throw new HttpError(400, 'Choose an image.');
  const saved = await saveImage(buffer);
  if (!saved) throw new HttpError(400, 'Upload a JPEG, PNG, or WebP image.');
  doc.images.push({
    id: saved.filename.replace(/\.[^.]+$/, ''),
    alt: doc.name,
    src: saved.src,
  });
  await doc.save();
  await recordAudit({
    actorId,
    action: 'product.image',
    target: doc.id,
    after: saved.src,
  });
  return doc.toObject();
}

export async function removeProductImage({ id, imageId, actorId }) {
  const doc = await Product.findOne({ id });
  if (!doc) throw new HttpError(404, 'Product not found.');
  const image = doc.images.find((item) => item.id === imageId);
  if (!image) throw new HttpError(404, 'Image not found.');
  doc.images = doc.images.filter((item) => item.id !== imageId);
  await doc.save();
  await removeImage(image.src);
  await recordAudit({
    actorId,
    action: 'product.image.remove',
    target: doc.id,
    before: image.src,
  });
  return doc.toObject();
}

export async function listOrders(query) {
  const { status, q, from, to } = query;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { orderNumber: { $regex: pattern, $options: 'i' } },
      { email: { $regex: pattern, $options: 'i' } },
    ];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return {
    orders: orders.map((order) => ({
      orderNumber: order.orderNumber,
      email: order.email,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      itemCount: order.items.length,
    })),
  };
}

export async function getOrder(orderNumber) {
  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) throw new HttpError(404, 'Order not found.');
  return { order, transitions: TRANSITIONS[order.status] || [] };
}

export async function setOrderStatus(orderNumber, status, actor) {
  const order = await changeOrderStatus(orderNumber, status, actor);
  return { order, transitions: TRANSITIONS[order.status] || [] };
}

export async function addOrderNote({ orderNumber, text, actor }) {
  const order = await Order.findOne({ orderNumber });
  if (!order) throw new HttpError(404, 'Order not found.');
  order.notes.push({
    text,
    authorName: actor.name,
    createdAt: new Date(),
  });
  await order.save();
  await recordAudit({
    actorId: actor._id,
    action: 'order.note',
    target: order.orderNumber,
    after: text,
  });
  return order;
}

export async function listCustomers(q) {
  const filter = {};
  if (q) {
    const pattern = escapeRegex(q);
    filter.$or = [
      { email: { $regex: pattern, $options: 'i' } },
      { name: { $regex: pattern, $options: 'i' } },
    ];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return { customers: users.map(publicUser) };
}

export async function getCustomer(id) {
  knownUserId(id);
  const user = await User.findById(id).lean();
  if (!user) throw new HttpError(404, 'Customer not found.');
  const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  return {
    customer: publicUser(user),
    orders: orders.map((order) => ({
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    })),
  };
}

export async function setCustomerActive({ id, isActive, actorId }) {
  knownUserId(id);
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'Customer not found.');
  if (isActive === false) await assertNotLastAdmin(user);
  const before = `isActive=${user.isActive}`;
  user.isActive = isActive;
  await user.save();
  if (!user.isActive) await Session.deleteMany({ userId: user._id });
  await recordAudit({
    actorId,
    action: 'user.active',
    target: user.email,
    before,
    after: `isActive=${user.isActive}`,
  });
  return { customer: publicUser(user) };
}

export async function setCustomerRole({ id, role, actorId }) {
  knownUserId(id);
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'Customer not found.');
  if (user.role === 'admin' && role !== 'admin') await assertNotLastAdmin(user);
  const before = user.role;
  user.role = role;
  await user.save();
  if (role !== 'admin') await Session.deleteMany({ userId: user._id });
  await recordAudit({
    actorId,
    action: 'user.role',
    target: user.email,
    before,
    after: role,
  });
  return { customer: publicUser(user) };
}

export async function listAudit() {
  const entries = await AuditLog.find().sort({ createdAt: -1 }).limit(50).lean();
  const actors = await User.find({ _id: { $in: entries.map((entry) => entry.actorId) } }).lean();
  const names = new Map(actors.map((user) => [String(user._id), user.email]));
  return {
    entries: entries.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      target: entry.target,
      before: entry.before,
      after: entry.after,
      actor: names.get(String(entry.actorId)) || 'Unknown',
      createdAt: entry.createdAt,
    })),
  };
}
