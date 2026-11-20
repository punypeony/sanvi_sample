import { catalog } from '../../../shared/catalog.js';
import { placeholderReviews } from '../../../shared/reviews.js';

// Same placeholder rates the cart already shows. A carrier rate replaces them.
export const FREE_SHIPPING_AT = 50;
export const SHIPPING_PLACEHOLDER = 12;

// In-stock colorways start here. Out-of-stock colorways start at 0.
// A later seed does not put this number back.
export const IN_STOCK_COUNT = 24;

export const CUSTOMER = {
  email: 'customer@example.com',
  name: 'Avery Chen',
  addresses: [
    {
      label: 'Home',
      line1: '18 Mercer Street',
      city: 'Portland',
      region: 'Oregon',
      postal: '97209',
      country: 'United States',
    },
  ],
};

export function reviewerEmail(name) {
  const local = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
  return `${local}@example.com`;
}

export function productFromCatalog(source, previous) {
  const previousColorways = previous?.colorways ?? [];
  const next = {
    id: source.id,
    slug: source.slug,
    name: source.name,
    tagline: source.tagline,
    price: source.price,
    category: source.category,
    featured: Boolean(source.featured),
    flagship: Boolean(source.flagship),
    active: true,
    placeholder: true,
    features: source.features,
    specs: source.specs,
    images: source.images,
    relatedIds: source.relatedIds,
    fitsIds: source.fitsIds ?? [],
    rating: source.rating,
    reviewCount: source.reviewCount,
    colorways: source.colorways.map((colorway) => {
      const prior = previousColorways.find((item) => item.id === colorway.id);
      const stockCount = prior
        ? prior.stockCount
        : colorway.stock === 'out_of_stock'
          ? 0
          : IN_STOCK_COUNT;
      return {
        id: colorway.id,
        name: colorway.name,
        price: colorway.price,
        stockCount,
      };
    }),
  };
  if (source.compareAtPrice != null) next.compareAtPrice = source.compareAtPrice;
  return next;
}

export function buildReviewPlans() {
  return placeholderReviews.map((review, index) => {
    const last = index === placeholderReviews.length - 1;
    const beforeLast = index === placeholderReviews.length - 2;
    return {
      id: review.id,
      productId: 'noir-over-ear',
      email: reviewerEmail(review.name),
      name: review.name,
      rating: review.rating,
      text: review.text,
      colorway: review.colorway,
      status: last ? 'rejected' : beforeLast ? 'pending' : 'approved',
    };
  });
}

function line(productId, colorId, quantity) {
  const product = catalog.products.find((item) => item.id === productId);
  if (!product) throw new Error(`Missing catalog product ${productId}`);
  const color = product.colorways.find((item) => item.id === colorId);
  if (!color) throw new Error(`Missing color ${colorId} on ${productId}`);
  return {
    productId,
    name: product.name,
    colorId,
    colorName: color.name,
    unitPrice: color.price,
    quantity,
  };
}

function totals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_PLACEHOLDER;
  return { subtotal, shipping, total: subtotal + shipping };
}

function address(name, line1, city, region, postal) {
  return { name, line1, city, region, postal, country: 'United States' };
}

export function buildOrders() {
  const home = address(
    CUSTOMER.name,
    CUSTOMER.addresses[0].line1,
    CUSTOMER.addresses[0].city,
    CUSTOMER.addresses[0].region,
    CUSTOMER.addresses[0].postal,
  );
  const specs = [
    {
      orderNumber: 'NOIR-1001',
      owner: 'customer',
      email: CUSTOMER.email,
      status: 'delivered',
      createdAt: '2026-09-12T15:04:00.000Z',
      address: home,
      lines: [['noir-over-ear', 'noir', 1]],
      payment: { provider: 'mock', reference: 'mock_noir_1001', status: 'paid' },
    },
    {
      orderNumber: 'NOIR-1002',
      owner: 'customer',
      email: CUSTOMER.email,
      status: 'shipped',
      createdAt: '2026-10-03T18:20:00.000Z',
      address: home,
      lines: [
        ['ear-cushions', 'black', 1],
        ['usb-c-cable', 'black', 1],
      ],
      payment: { provider: 'mock', reference: 'mock_noir_1002', status: 'paid' },
    },
    {
      orderNumber: 'NOIR-1003',
      owner: 'guest',
      email: 'riley.park@example.com',
      status: 'packed',
      createdAt: '2026-10-18T16:11:00.000Z',
      address: address('Riley Park', '4 Harbor Lane', 'Seattle', 'Washington', '98101'),
      lines: [['slate-over-ear', 'graphite', 1]],
      payment: { provider: 'mock', reference: 'mock_noir_1003', status: 'paid' },
    },
    {
      orderNumber: 'NOIR-1004',
      owner: 'guest',
      email: 'jordan.lee@example.com',
      status: 'paid',
      createdAt: '2026-11-02T21:40:00.000Z',
      address: address('Jordan Lee', '88 King Street', 'Denver', 'Colorado', '80202'),
      lines: [['travel-case', 'bone', 1]],
      payment: { provider: 'mock', reference: 'mock_noir_1004', status: 'paid' },
    },
    {
      orderNumber: 'NOIR-1005',
      owner: 'guest',
      email: 'sam.okonkwo@example.com',
      status: 'pending',
      createdAt: '2026-11-15T13:05:00.000Z',
      address: address('Sam Okonkwo', '15 Elm Street', 'Austin', 'Texas', '78701'),
      lines: [['linen-on-ear', 'oat', 1]],
      payment: { provider: 'mock', reference: 'mock_noir_1005', status: 'pending' },
    },
    {
      orderNumber: 'NOIR-1006',
      owner: 'customer',
      email: CUSTOMER.email,
      status: 'cancelled',
      createdAt: '2026-11-18T19:32:00.000Z',
      address: home,
      lines: [['usb-c-cable', 'black', 2]],
      payment: { provider: 'mock', reference: 'mock_noir_1006', status: 'failed' },
    },
    {
      orderNumber: 'NOIR-1007',
      owner: 'guest',
      email: 'nora.diaz@example.com',
      status: 'refunded',
      createdAt: '2026-08-20T11:16:00.000Z',
      address: address('Nora Diaz', '220 Lake Avenue', 'Chicago', 'Illinois', '60601'),
      lines: [['studio-bundle', 'noir', 1]],
      payment: { provider: 'mock', reference: 'mock_noir_1007', status: 'refunded' },
    },
  ];

  return specs.map((spec) => {
    const items = spec.lines.map(([productId, colorId, quantity]) => line(productId, colorId, quantity));
    return {
      orderNumber: spec.orderNumber,
      owner: spec.owner,
      email: spec.email,
      items,
      shippingAddress: spec.address,
      ...totals(items),
      status: spec.status,
      payment: spec.payment,
      idempotencyKey: `seed:${spec.orderNumber}`,
      placeholder: true,
      createdAt: new Date(spec.createdAt),
    };
  });
}

export function assertCatalogShape() {
  const flagships = catalog.products.filter((item) => item.flagship);
  if (flagships.length !== 1) {
    throw new Error('The catalog needs exactly one flagship product.');
  }
}
