import { randomBytes } from 'node:crypto';
import { config } from '../config/index.js';
import { HttpError } from '../utils/httpError.js';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { sendOrderConfirmation } from '../providers/email.js';
import { FREE_SHIPPING_AT, SHIPPING_PLACEHOLDER } from '../seed/placeholders.js';
import { mockCharge } from '../providers/payment.js';
import { releaseLines, reserveLines } from './stock.js';

function duplicateField(error) {
  const pattern = error?.keyPattern || error?.cause?.keyPattern || {};
  if (pattern.orderNumber) return 'orderNumber';
  if (pattern.idempotencyKey) return 'idempotencyKey';
  const text = String(error?.message || '');
  if (text.includes('orderNumber')) return 'orderNumber';
  if (text.includes('idempotencyKey')) return 'idempotencyKey';
  return '';
}

function newOrderNumber() {
  return `NOIR-${Date.now().toString(36).toUpperCase()}${randomBytes(2).toString('hex').toUpperCase()}`;
}

function mergeLines(lines) {
  const map = new Map();
  for (const line of lines) {
    const key = `${line.productId}:${line.colorId}`;
    const found = map.get(key);
    if (found) found.quantity = Math.min(9, found.quantity + line.quantity);
    else map.set(key, { productId: line.productId, colorId: line.colorId, quantity: line.quantity });
  }
  return [...map.values()];
}

async function priceLines(lines) {
  const priced = [];
  for (const line of mergeLines(lines)) {
    const product = await Product.findOne({ id: line.productId, active: true });
    const color = product?.colorways.find((item) => item.id === line.colorId);
    if (!product || !color) throw new HttpError(400, 'A product in the cart is no longer available.');
    if (color.stockCount < line.quantity) {
      throw new HttpError(409, `${product.name} in ${color.name} is out of stock.`);
    }
    priced.push({
      productId: product.id,
      name: product.name,
      colorId: color.id,
      colorName: color.name,
      unitPrice: color.price,
      quantity: line.quantity,
    });
  }
  return priced;
}

export function toPublicOrder(order) {
  const doc = order.toObject ? order.toObject() : order;
  return {
    orderNumber: doc.orderNumber,
    email: doc.email,
    items: doc.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      colorId: item.colorId,
      colorName: item.colorName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    shippingAddress: doc.shippingAddress,
    subtotal: doc.subtotal,
    shipping: doc.shipping,
    total: doc.total,
    status: doc.status,
    payment: {
      provider: doc.payment.provider,
      reference: doc.payment.reference,
      status: doc.payment.status,
    },
    createdAt: doc.createdAt,
  };
}

async function existingOrder(idempotencyKey, email) {
  const existing = await Order.findOne({ idempotencyKey });
  if (!existing) return null;
  if (existing.email !== email) throw new HttpError(409, 'That idempotency key was already used.');
  return existing;
}

export async function createOrder({ user, email, lines, shippingAddress, idempotencyKey, outcome }) {
  const replay = await existingOrder(idempotencyKey, email);
  if (replay) return { order: replay, created: false };

  const declined = outcome === 'decline' && config.env !== 'production';
  if (declined) throw new HttpError(402, 'The payment was declined. Nothing was reserved.');

  const priced = await priceLines(lines);
  const subtotal = priced.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_PLACEHOLDER;
  const charge = mockCharge({ outcome, allowDecline: false });

  await reserveLines(priced);
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const order = await Order.create({
          orderNumber: newOrderNumber(),
          userId: user?._id,
          email,
          items: priced,
          shippingAddress,
          subtotal,
          shipping,
          total: subtotal + shipping,
          status: 'paid',
          payment: {
            provider: charge.provider,
            reference: charge.reference,
            status: charge.status,
          },
          idempotencyKey,
          stockCommitted: true,
          placeholder: false,
        });
        return { order, created: true };
      } catch (error) {
        if (duplicateField(error) === 'orderNumber' && attempt < 2) continue;
        throw error;
      }
    }
    throw new HttpError(500, 'The order could not be saved.');
  } catch (error) {
    await releaseLines(priced);
    if (duplicateField(error) === 'idempotencyKey') {
      const winner = await existingOrder(idempotencyKey, email);
      if (winner) return { order: winner, created: false };
    }
    throw error;
  }
}

export function countGuestOrders(email) {
  return Order.countDocuments({ email, userId: null });
}

export async function attachGuestOrders(user) {
  const result = await Order.updateMany(
    { email: user.email, userId: null },
    { $set: { userId: user._id } },
  );
  return result.modifiedCount || 0;
}

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,80}$/;

export async function placeOrder({ user, email, lines, shippingAddress, outcome, idempotencyKey }) {
  if (!IDEMPOTENCY_KEY.test(idempotencyKey || '')) {
    throw new HttpError(400, 'Missing idempotency key.');
  }
  const normalized = email.toLowerCase();
  const { order, created } = await createOrder({
    user,
    email: normalized,
    lines,
    shippingAddress,
    idempotencyKey,
    outcome,
  });
  if (created && user) {
    await Cart.updateOne({ userId: user._id }, { $set: { lines: [] } });
  }
  if (created && config.env !== 'test') sendOrderConfirmation(order);
  return { order: toPublicOrder(order), created };
}

export async function lookupOrder({ orderNumber, email }) {
  const order = await Order.findOne({
    orderNumber,
    email: email.toLowerCase(),
  });
  if (!order) throw new HttpError(404, 'No order matches that number and email.');
  return toPublicOrder(order);
}

export async function listOrdersForUser(userId) {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return { orders: orders.map(toPublicOrder) };
}

export async function getOwnedOrder(user, orderNumber) {
  const order = await Order.findOne({ orderNumber });
  const owns = order && (
    (order.userId && String(order.userId) === String(user._id))
    || order.email === user.email
  );
  if (!owns) throw new HttpError(404, 'Order not found.');
  return toPublicOrder(order);
}
