import { useSyncExternalStore } from 'react';
import { api } from '../api/client';
import { cachedProduct, getCatalogVersion, subscribeCatalog } from '../data/catalogCache';
import { flagship, getProductById } from '../data/products';

// Cart seam. Components talk to this module and nothing else.
// Guests stay in localStorage. A signed-in shopper merges with the server cart.
// The stored shape is:
//   { lines: [{ productId: string, colorId: string, quantity: number }], ownerId }
// Older saves have no productId. Those lines are the flagship.

const STORAGE_KEY = 'noir-cart';
export const QTY_CAP = 9;
// Placeholder shipping. A carrier rate replaces these two numbers.
export const FREE_SHIPPING_AT = 50;
export const SHIPPING_PLACEHOLDER = 12;

let ownerId = null;
let syncedFor = null;
let generation = 0;
let adopting = null;
let chain = Promise.resolve();

function productFor(id) {
  return cachedProduct(id) || getProductById(id) || null;
}

function normalize(line) {
  if (!line) return null;
  const quantity = Math.min(QTY_CAP, Math.max(1, Math.round(Number(line.quantity)) || 1));
  const productId = line.productId || flagship?.id;
  if (!productId || !line.colorId) return null;
  const product = productFor(productId);
  if (!product) {
    return { productId: String(productId), colorId: String(line.colorId), quantity };
  }
  const color = product.colorways.find((item) => item.id === line.colorId);
  if (!color) return null;
  return { productId: product.id, colorId: color.id, quantity };
}

function loadStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.lines)) return [];
    if (typeof data.ownerId === 'string') ownerId = data.ownerId;
    return data.lines.map(normalize).filter(Boolean);
  } catch {
    return [];
  }
}

function writeCart() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, ownerId }));
  } catch {
    /* storage can be blocked; the cart still works for this visit */
  }
}

let lines = loadStored();
const listeners = new Set();
let cartOpen = false;
const openListeners = new Set();

function queueSync() {
  if (!ownerId) return;
  const snapshot = lines.map((line) => ({ ...line }));
  const id = ownerId;
  chain = chain.catch(() => {}).then(async () => {
    if (ownerId !== id) return;
    await api('/api/cart', { method: 'PUT', body: JSON.stringify({ lines: snapshot }) });
  }).catch(() => {});
}

function commit({ sync = true } = {}) {
  writeCart();
  listeners.forEach((fn) => fn());
  if (sync && ownerId) queueSync();
}

export function getCart() {
  return lines;
}

export function subscribeCart(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addToCart(productId, colorId, quantity) {
  const line = normalize({ productId, colorId, quantity });
  if (!line) return getCart();
  const next = lines.map((item) => ({ ...item }));
  const found = next.find((item) => item.productId === line.productId && item.colorId === line.colorId);
  if (found) found.quantity = Math.min(QTY_CAP, found.quantity + line.quantity);
  else next.push(line);
  lines = next;
  commit();
  return lines;
}

export function setLineQuantity(productId, colorId, quantity) {
  const qty = Math.round(Number(quantity));
  if (!Number.isFinite(qty) || qty < 1) return removeLine(productId, colorId);
  const next = lines.map((item) => ({ ...item }));
  const found = next.find((item) => item.productId === productId && item.colorId === colorId);
  if (!found) return getCart();
  found.quantity = Math.min(QTY_CAP, qty);
  lines = next;
  commit();
  return lines;
}

export function removeLine(productId, colorId) {
  const next = lines.filter((item) => !(item.productId === productId && item.colorId === colorId));
  if (next.length === lines.length) return getCart();
  lines = next;
  commit();
  return lines;
}

export function clearCart() {
  lines = [];
  commit();
}

// Merge keeps the larger quantity when both sides have the same line, so a
// second sign-in does not double it.
export async function adoptUser(user) {
  if (!user?.id) return;
  if (syncedFor === user.id) return;
  if (adopting) return adopting;
  const start = generation;
  adopting = (async () => {
    const data = await api('/api/cart/merge', {
      method: 'POST',
      body: JSON.stringify({ lines: lines.map((line) => ({ ...line })) }),
    });
    if (start !== generation) return;
    lines = (data.lines || []).map((line) => ({
      productId: line.productId,
      colorId: line.colorId,
      quantity: line.quantity,
    }));
    ownerId = user.id;
    syncedFor = user.id;
    commit({ sync: false });
  })().finally(() => {
    adopting = null;
  });
  return adopting;
}

export function releaseUser() {
  generation += 1;
  syncedFor = null;
  adopting = null;
  if (!ownerId) return;
  ownerId = null;
  commit({ sync: false });
}

export function describeLine(line) {
  const item = productFor(line.productId);
  const color = item?.colorways.find((entry) => entry.id === line.colorId) || null;
  const unit = color ? color.price : 0;
  return {
    item,
    color,
    name: item ? item.name : line.productId,
    colorName: color ? color.name : line.colorId,
    unit,
    total: unit * line.quantity,
    image: item?.images[0] || null,
    category: item?.category || 'headphones',
  };
}

export function summarize(list) {
  const subtotal = list.reduce((sum, line) => sum + describeLine(line).total, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_PLACEHOLDER;
  return { subtotal, shipping, total: subtotal + shipping };
}

export function getCartOpen() {
  return cartOpen;
}

export function subscribeCartOpen(fn) {
  openListeners.add(fn);
  return () => openListeners.delete(fn);
}

export function setCartOpen(next) {
  if (next === cartOpen) return;
  cartOpen = next;
  openListeners.forEach((fn) => fn());
}

export function useCart() {
  const snapshot = useSyncExternalStore(subscribeCart, getCart, getCart);
  useSyncExternalStore(subscribeCatalog, getCatalogVersion, getCatalogVersion);
  const count = snapshot.reduce((sum, line) => sum + line.quantity, 0);
  return { lines: snapshot, count, addToCart, setLineQuantity, removeLine };
}

export function useCartOpen() {
  return useSyncExternalStore(subscribeCartOpen, getCartOpen, getCartOpen);
}
