// Shop filters live in the query string. `?color=` on /shop is a catalog
// color, and the model color is not written on this route.
// Price bands use the card price (product.price), inclusive.

export const CATEGORIES = [
  { id: 'headphones', label: 'Headphones' },
  { id: 'parts', label: 'Parts' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'bundles', label: 'Bundles' },
];

export const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price, low to high' },
  { id: 'price-desc', label: 'Price, high to low' },
  { id: 'rating', label: 'Rating' },
];

export const PRICE_RANGES = [
  { id: 'any', label: 'Any price', min: null, max: null },
  { id: 'under-50', label: 'Under $50', min: null, max: 50 },
  { id: '50-200', label: '$50 to $200', min: 50, max: 200 },
  { id: '200-400', label: '$200 to $400', min: 200, max: 400 },
  { id: '400-up', label: '$400 and up', min: 400, max: null },
];

const CATEGORY_IDS = new Set(CATEGORIES.map((item) => item.id));
const SORT_IDS = new Set(SORTS.map((item) => item.id));

const COLOR_ORDER = [
  'maroon',
  'sky',
  'noir',
  'ivory',
  'graphite',
  'fog',
  'clay',
  'oat',
  'ink',
  'black',
  'sand',
  'bone',
];

function money(raw) {
  if (raw == null || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100000) return null;
  return Math.round(value);
}

export function collectColors(list) {
  const names = new Map();
  list.forEach((product) => {
    product.colorways.forEach((color) => {
      if (!names.has(color.id)) names.set(color.id, color.name);
    });
  });
  return [...names.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => {
      const ai = COLOR_ORDER.indexOf(a.id);
      const bi = COLOR_ORDER.indexOf(b.id);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

export function parseShopQuery(params, colors) {
  const known = Array.isArray(colors) ? new Set(colors.map((color) => color.id)) : null;
  const category = params.get('category');
  const rawColor = params.get('color');
  const sort = params.get('sort');
  let min = money(params.get('min'));
  let max = money(params.get('max'));
  if (min != null && max != null && min > max) {
    const swap = min;
    min = max;
    max = swap;
  }
  const pageRaw = Number(params.get('page'));
  const colorOk = typeof rawColor === 'string'
    && /^[a-z0-9-]{1,40}$/.test(rawColor)
    && (!known || known.has(rawColor));
  return {
    category: CATEGORY_IDS.has(category) ? category : null,
    color: colorOk ? rawColor : null,
    sort: SORT_IDS.has(sort) ? sort : 'featured',
    min,
    max,
    q: (params.get('q') || '').trim().slice(0, 80),
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function serializeShopQuery(query) {
  const next = new URLSearchParams();
  if (query.category) next.set('category', query.category);
  if (query.color) next.set('color', query.color);
  if (query.min != null) next.set('min', String(query.min));
  if (query.max != null) next.set('max', String(query.max));
  if (query.sort && query.sort !== 'featured') next.set('sort', query.sort);
  if (query.q) next.set('q', query.q);
  if (query.page > 1) next.set('page', String(query.page));
  return next;
}

export function catalogParams(query) {
  const next = serializeShopQuery(query);
  next.set('limit', '24');
  return next;
}

export function matchingPriceRange(query) {
  return (
    PRICE_RANGES.find((range) => range.min === query.min && range.max === query.max) || null
  );
}

export function activeFilterCount(query) {
  let count = 0;
  if (query.category) count += 1;
  if (query.color) count += 1;
  if (query.min != null || query.max != null) count += 1;
  return count;
}

export function filterProducts(list, query) {
  const order = new Map(list.map((item, index) => [item.id, index]));
  const matched = list.filter((item) => {
    if (query.category && item.category !== query.category) return false;
    if (query.color && !item.colorways.some((color) => color.id === query.color)) return false;
    if (query.min != null && item.price < query.min) return false;
    if (query.max != null && item.price > query.max) return false;
    return true;
  });
  const sort = query.sort;
  return matched.slice().sort((a, b) => {
    const tie = order.get(a.id) - order.get(b.id);
    if (sort === 'price-asc') return a.price - b.price || tie;
    if (sort === 'price-desc') return b.price - a.price || tie;
    if (sort === 'rating') return b.rating - a.rating || b.reviewCount - a.reviewCount || tie;
    return (a.featured ? 0 : 1) - (b.featured ? 0 : 1) || tie;
  });
}
