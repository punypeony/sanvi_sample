import { useSyncExternalStore } from 'react';
import { COLORWAYS_BY_ID } from '../three/colorways';

// Cart seam. Components talk to this module and nothing else.
// A real checkout replaces readCart, writeCart, and checkout() with an
// Express route backed by Mongo. The stored shape stays:
//   { lines: [{ colorId: string, quantity: number }] }

const STORAGE_KEY = 'noir-cart';
const QTY_CAP = 9;

function empty() {
  return [];
}

function readCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.lines)) return empty();
    return data.lines
      .filter((line) => line && COLORWAYS_BY_ID[line.colorId])
      .map((line) => ({
        colorId: line.colorId,
        quantity: Math.min(QTY_CAP, Math.max(1, Math.round(Number(line.quantity)) || 1)),
      }));
  } catch {
    return empty();
  }
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

export function addToCart(colorId, quantity) {
  if (!COLORWAYS_BY_ID[colorId]) return getCart();
  const add = Math.min(QTY_CAP, Math.max(1, Math.round(quantity) || 1));
  const next = lines.map((line) => ({ ...line }));
  const found = next.find((line) => line.colorId === colorId);
  if (found) found.quantity = Math.min(QTY_CAP, found.quantity + add);
  else next.push({ colorId, quantity: add });
  lines = next;
  emit();
  return lines;
}

// Placeholder. Nothing is charged and nothing is sent.
export function checkout() {
  return { ok: false, reason: 'placeholder' };
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
  return { lines: snapshot, count, addToCart };
}

export function useCartOpen() {
  return useSyncExternalStore(subscribeCartOpen, getCartOpen, getCartOpen);
}
