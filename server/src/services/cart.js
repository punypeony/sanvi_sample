import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';

async function keepKnown(lines) {
  const kept = [];
  for (const line of lines) {
    const product = await Product.findOne({ id: line.productId, active: true });
    const color = product?.colorways.find((item) => item.id === line.colorId);
    if (!color) continue;
    const found = kept.find((item) => item.productId === line.productId && item.colorId === line.colorId);
    if (found) found.quantity = Math.min(9, found.quantity + line.quantity);
    else kept.push({ productId: line.productId, colorId: line.colorId, quantity: line.quantity });
  }
  return kept.slice(0, 30);
}

async function save(userId, lines) {
  const cart = await Cart.findOneAndUpdate(
    { userId },
    { $set: { lines } },
    { upsert: true, returnDocument: 'after' },
  );
  return cart.lines;
}

export async function getCart(userId) {
  const cart = await Cart.findOne({ userId });
  return { lines: cart?.lines || [] };
}

export async function replaceCart(userId, lines) {
  return { lines: await save(userId, await keepKnown(lines)) };
}

// Same product and color on both sides keeps the larger quantity, so signing
// in twice does not double the line.
export async function mergeCart(userId, lines) {
  const incoming = await keepKnown(lines);
  const current = await Cart.findOne({ userId });
  const map = new Map();
  for (const line of current?.lines || []) {
    map.set(`${line.productId}:${line.colorId}`, {
      productId: line.productId,
      colorId: line.colorId,
      quantity: line.quantity,
    });
  }
  for (const line of incoming) {
    const key = `${line.productId}:${line.colorId}`;
    const prev = map.get(key);
    if (!prev) map.set(key, line);
    else prev.quantity = Math.min(9, Math.max(prev.quantity, line.quantity));
  }
  return { lines: await save(userId, await keepKnown([...map.values()])) };
}
