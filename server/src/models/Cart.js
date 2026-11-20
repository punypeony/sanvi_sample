import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    colorId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 9 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    lines: { type: [lineSchema], default: [] },
  },
  { timestamps: true },
);

export const Cart = mongoose.model('Cart', cartSchema);
