import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, maxlength: 40 },
    line1: { type: String, required: true, maxlength: 200 },
    city: { type: String, required: true, maxlength: 80 },
    region: { type: String, required: true, maxlength: 80 },
    postal: { type: String, required: true, maxlength: 20 },
    country: { type: String, required: true, maxlength: 80 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+@.+\..+/,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, maxlength: 120 },
    role: { type: String, required: true, enum: ['customer', 'admin'], default: 'customer' },
    addresses: { type: [addressSchema], default: [] },
    isActive: { type: Boolean, required: true, default: true },
    placeholder: { type: Boolean, required: true, default: false },
    // Password reset. The raw token is emailed (logged, until a provider exists).
    // Only the hash is stored, and it expires.
    resetTokenHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
