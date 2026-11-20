import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { after, before, test } from 'node:test';
import { verifyPassword } from '../src/utils/password.js';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/noir-test';
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = '';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const { connectDb, disconnectDb } = await import('../src/db.js');
const { runSeed } = await import('../src/seed/run.js');
const { AuditLog, Order, Product, Review, User } = await import('../src/models/index.js');

const STATUSES = ['pending', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded'];

before(async () => {
  await connectDb();
  assert.equal(mongoose.connection.name, 'noir-test');
  await mongoose.connection.dropDatabase();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDb();
});

test('seed writes the placeholder catalog once', async () => {
  const messages = [];
  const result = await runSeed({ log: (line) => messages.push(line) });

  assert.equal(result.products, 8);
  assert.equal(result.reviews, 12);
  assert.equal(result.orders, 7);
  assert.equal(result.users, 14);
  assert.equal(await Product.countDocuments({ flagship: true }), 1);
  assert.equal(await User.countDocuments({ role: 'admin' }), 1);
  assert.equal(await AuditLog.countDocuments(), 1);

  const noir = await Product.findOne({ id: 'noir-over-ear' }).lean();
  assert.equal(noir.slug, 'noir');
  assert.equal(noir.placeholder, true);
  assert.equal(noir.colorways.find((item) => item.id === 'noir').stockCount, 24);
  assert.equal(noir.colorways.find((item) => item.id === 'noir').stock, 'in_stock');
  assert.equal(noir.colorways.find((item) => item.id === 'ivory').stockCount, 0);
  assert.equal(noir.colorways.find((item) => item.id === 'ivory').stock, 'out_of_stock');

  assert.equal(await Review.countDocuments({ status: 'approved' }), 10);
  assert.equal(await Review.countDocuments({ status: 'pending' }), 1);
  assert.equal(await Review.countDocuments({ status: 'rejected' }), 1);

  for (const status of STATUSES) {
    assert.equal(await Order.countDocuments({ status }), 1, status);
  }

  const customer = await User.findOne({ email: 'customer@example.com' }).select('+passwordHash');
  const owned = await Order.findOne({ orderNumber: 'NOIR-1001' }).lean();
  assert.equal(String(owned.userId), String(customer._id));
  assert.equal(owned.items[0].unitPrice, 399);
  assert.equal(owned.shipping, 0);
  assert.equal(owned.total, 399);
  assert.deepEqual(Object.keys(owned.payment).sort(), ['provider', 'reference', 'status']);
  assert.equal(owned.payment.provider, 'mock');
  assert.equal(Order.schema.path('cardNumber'), undefined);
  assert.equal(Order.schema.path('payment.cardNumber'), undefined);

  const guest = await Order.findOne({ orderNumber: 'NOIR-1004' }).lean();
  assert.equal(guest.userId ?? null, null);
  assert.equal(guest.subtotal, 49);
  assert.equal(guest.shipping, 12);
  assert.equal(guest.total, 61);

  const admin = result.generated.find((item) => item.id);
  const adminDoc = await User.findOne({ role: 'admin' }).select('+passwordHash');
  const adminPassword = messages.join('\n').match(/password: (\S+)/)[1];
  assert.equal(await verifyPassword(adminDoc.passwordHash, adminPassword), true);
  assert.equal(JSON.stringify(adminDoc.toObject()).includes(adminPassword), false);
  assert.ok(admin);

  const names = (await mongoose.connection.db.listCollections().toArray()).map((item) => item.name);
  assert.ok(names.includes('carts'));
  assert.ok(names.includes('sessions'));
  assert.ok(names.includes('auditLogs'));
});

test('a second seed keeps passwords, stock, and order status', async () => {
  const admin = await User.findOne({ role: 'admin' }).select('+passwordHash');
  const hashBefore = admin.passwordHash;
  await Product.updateOne(
    { id: 'noir-over-ear', 'colorways.id': 'noir' },
    { $set: { 'colorways.$.stockCount': 3, tagline: 'changed' } },
  );
  await Order.updateOne({ orderNumber: 'NOIR-1005' }, { $set: { status: 'delivered' } });

  const messages = [];
  const result = await runSeed({ log: (line) => messages.push(line) });
  assert.equal(result.generated.length, 0);
  assert.equal(messages.join('\n').includes(hashBefore), false);
  assert.equal(messages.some((line) => line.includes('password: ')), false);

  const adminAfter = await User.findOne({ role: 'admin' }).select('+passwordHash');
  assert.equal(adminAfter.passwordHash, hashBefore);

  const noir = await Product.findOne({ id: 'noir-over-ear' }).lean();
  assert.equal(noir.tagline, 'The flagship. Every layer, engineered.');
  assert.equal(noir.colorways.find((item) => item.id === 'noir').stockCount, 3);
  assert.equal(noir.colorways.find((item) => item.id === 'ivory').stockCount, 0);

  const pending = await Order.findOne({ orderNumber: 'NOIR-1005' }).lean();
  assert.equal(pending.status, 'delivered');
  assert.equal(await Product.countDocuments(), 8);
  assert.equal(await Review.countDocuments(), 12);
  assert.equal(await Order.countDocuments(), 7);
  assert.equal(await User.countDocuments(), 14);
  assert.equal(await AuditLog.countDocuments(), 1);
});
