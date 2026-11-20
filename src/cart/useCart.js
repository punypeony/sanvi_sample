import { useSyncExternalStore } from 'react';
import { flagship, getProductById } from '../data/products';

// Cart seam. Components talk to this module and nothing else.
// A real checkout replaces readCart, writeCart, and checkout() with an
// Express route backed by Mongo. The stored shape is:
//   { lines: [{ productId: string, colorId: string, quantity: number }] }
// Older saves have no productId. Those lines are the flagship.

const STORAGE_KEY = 'noir-cart';
export const QTY_CAP = 9;
// Placeholder shipping. A carrier rate replaces these two numbers.
export const FREE_SHIPPING_AT = 50;
export const SHIPPING_PLACEHOLDER = 12;

function empty() {
  return [];
}

function readCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.lines)) return empty();
    return data.lines.map(normalize).filter(Boolean);
  } catch {
    return empty();
  }
}

function normalize(line) {
  if (!line) return null;
  const product = getProductById(line.productId) || (line.productId ? null : flagship);
  if (!product) return null;
  const color = product.colorways.find((item) => item.id === line.colorId);
  if (!color) return null;
  return {
    productId: product.id,
    colorId: color.id,
    quantity: Math.min(QTY_CAP, Math.max(1, Math.round(Number(line.quantity)) || 1)),
  };
}

function writeCart(lines) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines }));
  } catch {
    /* storage can be blocked; the cart still works for this visit */
  }
}

let lines = readCart();
const listeners = new Set();
let cartOpen = false;
const openListeners = new Set();

function emit() {
  writeCart(lines);
  listeners.forEach((fn) => fn());
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
  emit();
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
  emit();
  return lines;
}

export function removeLine(productId, colorId) {
  const next = lines.filter((item) => !(item.productId === productId && item.colorId === colorId));
  if (next.length === lines.length) return getCart();
  lines = next;
  emit();
  return lines;
}

export function describeLine(line) {
  const item = getProductById(line.productId);
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

// Seam for a payment provider. This builds a local placeholder order,
// clears the cart, and sends nothing. A real provider replaces this
// function. Card numbers are never accepted here.
export function checkout() {
  if (lines.length === 0) return { ok: false, reason: 'empty' };
  const placed = lines.map((line) => ({ ...line }));
  const summary = summarize(placed);
  lines = [];
  emit();
  return {
    ok: true,
    reason: 'placeholder',
    id: `PLACEHOLDER-${Date.now().toString(36).toUpperCase()}`,
    lines: placed,
    ...summary,
  };
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
  const count = snapshot.reduce((sum, line) => sum + line.quantity, 0);
  return { lines: snapshot, count, addToCart, setLineQuantity, removeLine };
}

export function useCartOpen() {
  return useSyncExternalStore(subscribeCartOpen, getCartOpen, getCartOpen);
}
