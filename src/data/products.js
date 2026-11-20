// Placeholder catalogue, shaped like a GET /api/products response.
// Prices, stock, specs, and copy are PLACEHOLDERS. An Express/Mongo API
// replaces this module; the component code should keep reading this shape.
//
// Images: leave `src` as '' and the page draws a neutral stand-in with the
// product name. Set `src` to a real photo URL and that photo is used instead.

export const catalog = {
  placeholder: true,
  currency: 'USD',
  products: [
    {
      id: 'noir-over-ear',
      slug: 'noir',
      name: 'Noir',
      tagline: 'The flagship. Every layer, engineered.',
      price: 399,
      category: 'headphones',
      placeholder: true,
      flagship: true,
      featured: true,
      rating: 4.8,
      reviewCount: 2310,
      features: ['Active noise cancelling', '40 mm dynamic driver', '30 hour battery'],
      specs: [
        { id: 'driver', label: 'Driver', value: '40 mm dynamic' },
        { id: 'frequency', label: 'Frequency response', value: '4 Hz – 40 kHz' },
        { id: 'isolation', label: 'Isolation', value: '−22 dB passive' },
        { id: 'battery', label: 'Battery', value: '30 hours' },
        { id: 'weight', label: 'Weight', value: '268 g' },
        { id: 'charging', label: 'Charging', value: 'USB-C' },
        { id: 'mics', label: 'Microphones', value: '4' },
      ],
      // These four ids match the 3D colorways. Do not rename them.
      colorways: [
        { id: 'maroon', name: 'Maroon', stock: 'in_stock', price: 449 },
        { id: 'sky', name: 'Sky Blue', stock: 'in_stock', price: 429 },
        { id: 'noir', name: 'Noir', stock: 'in_stock', price: 399 },
        { id: 'ivory', name: 'Ivory', stock: 'out_of_stock', price: 449 },
      ],
      images: [{ id: 'noir-hero', alt: 'Noir over-ear headphones', src: '' }],
      relatedIds: ['ear-cushions', 'travel-case', 'usb-c-cable', 'studio-bundle'],
      fitsIds: [],
    },
    {
      id: 'slate-over-ear',
      slug: 'slate',
      name: 'Slate',
      tagline: 'A lighter over-ear for the desk and the commute.',
      price: 249,
      compareAtPrice: 299,
      category: 'headphones',
      placeholder: true,
      flagship: false,
      featured: true,
      rating: 4.6,
      reviewCount: 840,
      features: ['Passive isolation', '32 hour battery', 'Fold-flat cups'],
      specs: [
        { id: 'driver', label: 'Driver', value: '40 mm dynamic' },
        { id: 'frequency', label: 'Frequency response', value: '8 Hz – 28 kHz' },
        { id: 'weight', label: 'Weight', value: '232 g' },
        { id: 'battery', label: 'Battery', value: '32 hours' },
      ],
      colorways: [
        { id: 'graphite', name: 'Graphite', stock: 'in_stock', price: 249 },
        { id: 'fog', name: 'Fog', stock: 'in_stock', price: 249 },
        { id: 'clay', name: 'Clay', stock: 'out_of_stock', price: 269 },
      ],
      images: [{ id: 'slate-hero', alt: 'Slate over-ear headphones', src: '' }],
      relatedIds: ['ear-cushions', 'travel-case', 'usb-c-cable'],
      fitsIds: [],
    },
    {
      id: 'linen-on-ear',
      slug: 'linen',
      name: 'Linen',
      tagline: 'On-ear, for rooms that are already quiet.',
      price: 179,
      category: 'headphones',
      placeholder: true,
      flagship: false,
      featured: true,
      rating: 4.4,
      reviewCount: 510,
      features: ['On-ear fit', 'Wired or Bluetooth', '120 g'],
      specs: [
        { id: 'driver', label: 'Driver', value: '30 mm dynamic' },
        { id: 'weight', label: 'Weight', value: '120 g' },
        { id: 'battery', label: 'Battery', value: '22 hours' },
        { id: 'cable', label: 'Cable', value: 'Detachable 1.2 m' },
      ],
      colorways: [
        { id: 'oat', name: 'Oat', stock: 'in_stock', price: 179 },
        { id: 'ink', name: 'Ink', stock: 'in_stock', price: 179 },
      ],
      images: [{ id: 'linen-hero', alt: 'Linen on-ear headphones', src: '' }],
      relatedIds: ['travel-case', 'usb-c-cable'],
      fitsIds: [],
    },
    {
      id: 'ear-cushions',
      slug: 'ear-cushions',
      name: 'Ear cushions',
      tagline: 'A replacement pair for the over-ear models.',
      price: 39,
      category: 'parts',
      placeholder: true,
      flagship: false,
      featured: true,
      rating: 4.7,
      reviewCount: 1260,
      features: ['Memory foam', 'Magnetic fit', 'Sold as a pair'],
      specs: [
        { id: 'material', label: 'Material', value: 'Protein leather, memory foam' },
        { id: 'fit', label: 'Fit', value: 'Magnetic' },
        { id: 'pair', label: 'In the box', value: 'One pair' },
      ],
      colorways: [
        { id: 'black', name: 'Black', stock: 'in_stock', price: 39 },
        { id: 'sand', name: 'Sand', stock: 'out_of_stock', price: 39 },
      ],
      images: [{ id: 'cushions-hero', alt: 'Replacement ear cushions', src: '' }],
      relatedIds: ['noir-over-ear', 'slate-over-ear', 'headband-cushion'],
      fitsIds: ['noir-over-ear', 'slate-over-ear'],
    },
    {
      id: 'headband-cushion',
      slug: 'headband-cushion',
      name: 'Headband cushion',
      tagline: 'The pad under the band, on its own.',
      price: 29,
      category: 'parts',
      placeholder: true,
      flagship: false,
      rating: 4.5,
      reviewCount: 640,
      features: ['14 mm foam', 'Slides on', 'One cushion'],
      specs: [
        { id: 'material', label: 'Material', value: 'Memory foam, vegan leather' },
        { id: 'thickness', label: 'Thickness', value: '14 mm' },
      ],
      colorways: [{ id: 'black', name: 'Black', stock: 'in_stock', price: 29 }],
      images: [{ id: 'band-hero', alt: 'Replacement headband cushion', src: '' }],
      relatedIds: ['noir-over-ear', 'ear-cushions'],
      fitsIds: ['noir-over-ear'],
    },
    {
      id: 'travel-case',
      slug: 'travel-case',
      name: 'Travel case',
      tagline: 'A hard case sized for the fold-flat cups.',
      price: 49,
      category: 'accessories',
      placeholder: true,
      flagship: false,
      featured: true,
      rating: 4.3,
      reviewCount: 390,
      features: ['Hardshell', 'Fits the cable', 'Internal pocket'],
      specs: [
        { id: 'shell', label: 'Shell', value: 'Molded polymer' },
        { id: 'size', label: 'Outside', value: '210 × 180 × 70 mm' },
      ],
      colorways: [
        { id: 'black', name: 'Black', stock: 'in_stock', price: 49 },
        { id: 'bone', name: 'Bone', stock: 'in_stock', price: 49 },
      ],
      images: [{ id: 'case-hero', alt: 'Hard travel case', src: '' }],
      relatedIds: ['noir-over-ear', 'usb-c-cable'],
      fitsIds: ['noir-over-ear', 'slate-over-ear', 'linen-on-ear'],
    },
    {
      id: 'usb-c-cable',
      slug: 'usb-c-cable',
      name: 'USB-C cable',
      tagline: 'Charge cable, one metre, nothing else on it.',
      price: 19,
      category: 'accessories',
      placeholder: true,
      flagship: false,
      rating: 4.2,
      reviewCount: 220,
      features: ['1 m', 'USB-C to USB-C', 'Braided'],
      specs: [
        { id: 'length', label: 'Length', value: '1 m' },
        { id: 'ends', label: 'Ends', value: 'USB-C to USB-C' },
      ],
      colorways: [{ id: 'black', name: 'Black', stock: 'in_stock', price: 19 }],
      images: [{ id: 'cable-hero', alt: 'Braided USB-C cable', src: '' }],
      relatedIds: ['noir-over-ear', 'travel-case'],
      fitsIds: ['noir-over-ear', 'slate-over-ear', 'linen-on-ear'],
    },
    {
      id: 'studio-bundle',
      slug: 'studio-bundle',
      name: 'Studio bundle',
      tagline: 'Noir, a spare set of cushions, the case, and a cable.',
      price: 459,
      compareAtPrice: 506,
      category: 'bundles',
      placeholder: true,
      flagship: false,
      rating: 4.9,
      reviewCount: 180,
      features: ['Noir in Noir', 'Spare cushions', 'Case and cable'],
      specs: [
        { id: 'includes', label: 'Includes', value: 'Noir, ear cushions, case, cable' },
        { id: 'color', label: 'Headphones', value: 'Noir' },
      ],
      colorways: [{ id: 'noir', name: 'Noir', stock: 'in_stock', price: 459 }],
      images: [{ id: 'bundle-hero', alt: 'Studio bundle', src: '' }],
      relatedIds: ['noir-over-ear', 'ear-cushions', 'travel-case'],
      fitsIds: [],
    },
  ],
};

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
