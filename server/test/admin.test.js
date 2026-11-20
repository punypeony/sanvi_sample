import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { after, before, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/noir-test';
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = '';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.AUTH_RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_MAX = '1000';

const { createApp } = await import('../src/app.js');
const { connectDb, disconnectDb } = await import('../src/db.js');
const { Order } = await import('../src/models/Order.js');
const { Product } = await import('../src/models/Product.js');
const { User } = await import('../src/models/User.js');
const { hashPassword } = await import('../src/utils/password.js');

const app = createApp();
const ADMIN_PASSWORD = 'admin-password-test';
const CUSTOMER_PASSWORD = 'customer-password-test';

function cookieLine(res, name) {
  const raw = res.headers['set-cookie'] || [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.find((item) => item.startsWith(`${name}=`)) || '';
}

async function signIn(email, password) {
  const agent = request.agent(app);
  const csrf = await agent.get('/api/auth/csrf');
  const token = csrf.body.token;
  const res = await agent.post('/api/auth/login').set('x-csrf-token', token).send({ email, password });
  return { agent, token, res, csrf };
}

before(async () => {
  await connectDb();
  assert.equal(mongoose.connection.name, 'noir-test');
  await mongoose.connection.dropDatabase();
  await User.create({
    email: 'admin@example.com',
    name: 'Ada Admin',
    role: 'admin',
    passwordHash: await hashPassword(ADMIN_PASSWORD),
    isActive: true,
    placeholder: true,
  });
  await User.create({
    email: 'customer@example.com',
    name: 'Casey Customer',
    role: 'customer',
    passwordHash: await hashPassword(CUSTOMER_PASSWORD),
    isActive: true,
    placeholder: true,
  });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDb();
});

test('login does not reveal which part failed, and the session cookie is httpOnly', async () => {
  const unknown = await signIn('nobody@example.com', 'not-the-password');
  const wrong = await signIn('customer@example.com', 'not-the-password');
  assert.equal(unknown.res.status, 401);
  assert.equal(wrong.res.status, 401);
  assert.equal(unknown.res.body.error, wrong.res.body.error);

  const admin = await signIn('admin@example.com', ADMIN_PASSWORD);
  assert.equal(admin.res.status, 200);
  assert.equal(admin.res.body.role, 'admin');
  const session = cookieLine(admin.res, 'noir.sid');
  assert.match(session, /HttpOnly/i);
  assert.match(session, /SameSite=Lax/i);
  assert.doesNotMatch(session, /Secure/i);

  const dashboard = await admin.agent.get('/api/admin/dashboard').set('x-csrf-token', admin.token);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.placeholder, true);
});

test('a customer is rejected from the admin API', async () => {
  const guest = await request(app).get('/api/admin/dashboard');
  assert.equal(guest.status, 401);

  const customer = await signIn('customer@example.com', CUSTOMER_PASSWORD);
  assert.equal(customer.res.status, 200);
  const dashboard = await customer.agent.get('/api/admin/dashboard');
  assert.equal(dashboard.status, 403);
  assert.equal(dashboard.body.error, 'Admin access is required.');
});

test('every admin route rejects guests and customers', async () => {
  const paths = [
    ['get', '/api/admin/dashboard'],
    ['get', '/api/admin/products'],
    ['get', '/api/admin/products/sample'],
    ['post', '/api/admin/products'],
    ['patch', '/api/admin/products/sample'],
    ['post', '/api/admin/products/sample/images'],
    ['delete', '/api/admin/products/sample/images/sample'],
    ['get', '/api/admin/orders'],
    ['get', '/api/admin/orders/NOIR-1001'],
    ['patch', '/api/admin/orders/NOIR-1001'],
    ['post', '/api/admin/orders/NOIR-1001/notes'],
    ['get', '/api/admin/customers'],
    ['get', '/api/admin/customers/000000000000000000000000'],
    ['patch', '/api/admin/customers/000000000000000000000000'],
    ['post', '/api/admin/users/000000000000000000000000/role'],
    ['get', '/api/admin/reviews'],
    ['patch', '/api/admin/reviews/sample'],
    ['get', '/api/admin/audit'],
  ];
  for (const [method, path] of paths) {
    const guest = await request(app)[method](path);
    assert.equal(guest.status, 401, `${method} ${path}`);
  }
  const customer = await signIn('customer@example.com', CUSTOMER_PASSWORD);
  for (const [method, path] of paths) {
    const res = await customer.agent[method](path);
    assert.equal(res.status, 403, `${method} ${path}`);
    assert.equal(res.body.error, 'Admin access is required.');
  }
});

test('the last admin cannot be demoted or deactivated', async () => {
  const admin = await signIn('admin@example.com', ADMIN_PASSWORD);
  const adminUser = await User.findOne({ email: 'admin@example.com' });
  const customer = await User.findOne({ email: 'customer@example.com' });

  const demote = await admin.agent
    .post(`/api/admin/users/${adminUser._id}/role`)
    .set('x-csrf-token', admin.token)
    .send({ role: 'customer' });
  assert.equal(demote.status, 409);

  const deactivate = await admin.agent
    .patch(`/api/admin/customers/${adminUser._id}`)
    .set('x-csrf-token', admin.token)
    .send({ isActive: false });
  assert.equal(deactivate.status, 409);

  const promote = await admin.agent
    .post(`/api/admin/users/${customer._id}/role`)
    .set('x-csrf-token', admin.token)
    .send({ role: 'admin' });
  assert.equal(promote.status, 200);

  const demoteNow = await admin.agent
    .post(`/api/admin/users/${adminUser._id}/role`)
    .set('x-csrf-token', admin.token)
    .send({ role: 'customer' });
  assert.equal(demoteNow.status, 200);

  const restoreAdmin = await admin.agent
    .post(`/api/admin/users/${adminUser._id}/role`)
    .set('x-csrf-token', admin.token)
    .send({ role: 'admin' });
  assert.equal(restoreAdmin.status, 401);

  const second = await signIn('customer@example.com', CUSTOMER_PASSWORD);
  const restore = await second.agent
    .post(`/api/admin/users/${adminUser._id}/role`)
    .set('x-csrf-token', second.token)
    .send({ role: 'admin' });
  assert.equal(restore.status, 200);
  const restoreCustomer = await second.agent
    .post(`/api/admin/users/${customer._id}/role`)
    .set('x-csrf-token', second.token)
    .send({ role: 'customer' });
  assert.equal(restoreCustomer.status, 200);
});

test('cancel restores committed stock and refuses an illegal status', async () => {
  const admin = await signIn('admin@example.com', ADMIN_PASSWORD);
  const created = await admin.agent
    .post('/api/admin/products')
    .set('x-csrf-token', admin.token)
    .send({
      id: 'test-cup',
      slug: 'test-cup',
      name: 'Test cup',
      tagline: 'A placeholder cup.',
      price: 10,
      category: 'accessories',
      featured: false,
      flagship: false,
      active: true,
      features: ['Lightweight'],
      colorways: [{ id: 'black', name: 'Black', price: 10, stockCount: 4 }],
    });
  assert.equal(created.status, 201);

  const address = {
    name: 'Buyer',
    line1: '1 Road',
    city: 'Portland',
    region: 'Oregon',
    postal: '97209',
    country: 'United States',
  };
  const item = {
    productId: 'test-cup',
    name: 'Test cup',
    colorId: 'black',
    colorName: 'Black',
    unitPrice: 10,
    quantity: 2,
  };
  await Order.create({
    orderNumber: 'TEST-1001',
    email: 'buyer@example.com',
    items: [item],
    shippingAddress: address,
    subtotal: 20,
    shipping: 12,
    total: 32,
    status: 'paid',
    payment: { provider: 'mock', reference: 'mock_test_1001', status: 'paid' },
    idempotencyKey: 'test:1001',
    stockCommitted: true,
    placeholder: true,
  });
  await Order.create({
    orderNumber: 'TEST-1002',
    email: 'buyer@example.com',
    items: [{ ...item, quantity: 1 }],
    shippingAddress: address,
    subtotal: 10,
    shipping: 12,
    total: 22,
    status: 'paid',
    payment: { provider: 'mock', reference: 'mock_test_1002', status: 'paid' },
    idempotencyKey: 'test:1002',
    stockCommitted: false,
    placeholder: true,
  });

  const missing = await admin.agent
    .patch('/api/admin/orders/TEST-1001')
    .send({ status: 'cancelled' });
  assert.equal(missing.status, 403);

  const cancelled = await admin.agent
    .patch('/api/admin/orders/TEST-1001')
    .set('x-csrf-token', admin.token)
    .send({ status: 'cancelled' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.order.status, 'cancelled');

  const untouched = await admin.agent
    .patch('/api/admin/orders/TEST-1002')
    .set('x-csrf-token', admin.token)
    .send({ status: 'cancelled' });
  assert.equal(untouched.status, 200);

  const product = await Product.findOne({ id: 'test-cup' });
  assert.equal(product.colorways[0].stockCount, 6);
  assert.equal(product.colorways[0].stock, 'in_stock');

  const again = await admin.agent
    .patch('/api/admin/orders/TEST-1001')
    .set('x-csrf-token', admin.token)
    .send({ status: 'packed' });
  assert.equal(again.status, 409);

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const uploaded = await admin.agent
    .post('/api/admin/products/test-cup/images')
    .set('x-csrf-token', admin.token)
    .attach('image', png, { filename: 'dot.png', contentType: 'image/png' });
  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.body.product.images.length, 1);
  assert.match(uploaded.body.product.images[0].src, /^\/api\/uploads\/[a-f0-9]{32}\.png$/);

  const text = await admin.agent
    .post('/api/admin/products/test-cup/images')
    .set('x-csrf-token', admin.token)
    .attach('image', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });
  assert.equal(text.status, 400);
});
