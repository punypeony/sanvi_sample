const byId = new Map();
let version = 0;
const listeners = new Set();

export function rememberProducts(list) {
  if (!list?.length) return;
  for (const product of list) {
    if (product?.id) byId.set(product.id, product);
  }
  version += 1;
  listeners.forEach((fn) => fn());
}

export function cachedProduct(id) {
  return byId.get(id) || null;
}

export function getCatalogVersion() {
  return version;
}

export function subscribeCatalog(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
