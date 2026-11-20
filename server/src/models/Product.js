import mongoose from 'mongoose';

const colorwaySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    // The number an order decrements. stock is derived from it.
    stockCount: { type: Number, required: true, min: 0 },
    stock: { type: String, required: true, enum: ['in_stock', 'out_of_stock'] },
  },
  { _id: false },
);

const specSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const imageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    alt: { type: String, required: true },
    src: { type: String, default: '' },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    // Public id already used by the cart, related products, and the 3D links.
    id: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: {
      type: String,
      required: true,
      index: true,
      enum: ['headphones', 'parts', 'accessories', 'bundles'],
    },
    featured: { type: Boolean, required: true, default: false },
    flagship: { type: Boolean, required: true, default: false },
    active: { type: Boolean, required: true, default: true },
    placeholder: { type: Boolean, required: true, default: false },
    features: { type: [String], default: [] },
    specs: { type: [specSchema], default: [] },
    images: { type: [imageSchema], default: [] },
    relatedIds: { type: [String], default: [] },
    fitsIds: { type: [String], default: [] },
    rating: { type: Number, required: true, min: 0, max: 5 },
    reviewCount: { type: Number, required: true, min: 0 },
    colorways: { type: [colorwaySchema], required: true },
  },
  { timestamps: true, id: false },
);

productSchema.pre('validate', function deriveStock() {
  for (const colorway of this.colorways) {
    colorway.stock = colorway.stockCount > 0 ? 'in_stock' : 'out_of_stock';
  }
});

export const Product = mongoose.model('Product', productSchema);
