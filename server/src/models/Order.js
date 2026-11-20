import mongoose from 'mongoose';

// Payment stores a provider, a reference, and a status. Card numbers, expiry,
// and security codes are not fields on this schema.

const itemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    colorId: { type: String, required: true },
    colorName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    line1: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, maxlength: 80 },
    region: { type: String, required: true, maxlength: 80 },
    postal: { type: String, required: true, maxlength: 20 },
    country: { type: String, required: true, maxlength: 80 },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    reference: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'paid', 'failed', 'refunded'] },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    items: { type: [itemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'],
    },
    payment: { type: paymentSchema, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    // True after checkout reserves stock. Cancel and refund put it back once.
    stockCommitted: { type: Boolean, required: true, default: false },
    notes: {
      type: [
        new mongoose.Schema(
          {
            text: { type: String, required: true, maxlength: 500 },
            authorName: { type: String, required: true, maxlength: 120 },
            createdAt: { type: Date, required: true, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    placeholder: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const Order = mongoose.model('Order', orderSchema);
