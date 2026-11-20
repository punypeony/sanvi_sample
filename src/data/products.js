// Story helpers over the placeholder catalogue in shared/catalog.js.
// The shop list and standard product pages read the API. This module stays
// synchronous so the flagship story does not wait on the network, and so the
// cart can still describe a line before that request returns.

import { catalog } from '../../shared/catalog.js';

export { catalog };

export const products = catalog.products;

export const flagship = products.find((item) => item.flagship);

export const flagshipPath = `/products/${flagship.slug}`;

export function isStoryPath(pathname) {
  return pathname === '/' || pathname === flagshipPath;
}

export function getProductBySlug(slug) {
  return products.find((item) => item.slug === slug) || null;
}

export function getProductById(id) {
  return products.find((item) => item.id === id) || null;
}

if (import.meta.env.DEV && products.filter((item) => item.flagship).length !== 1) {
  console.warn('[catalog] expected exactly one flagship product');
}
