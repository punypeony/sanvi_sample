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

function shippingAddress() {
  return {
    name: 'Guest Buyer',
    line1: '1 Main Street',
    city: 'Portland',
    region: 'Oregon',
    postal: '97209',
    country: 'United States',
  };
}

async function agent() {
  const client = request.agent(app);
  const csrf = await client.get('/api/auth/csrf');
  return { client, token: csrf.body.token };
}

async function signIn(email, password) {
  const session = await agent();
  const res = await session.client
    .post('/api/auth/login')
    .set('x-csrf-token', session.token)
    .send({ email, password });
  return { ...session, res };
}

before(async () => {
  await connectDb();
  assert.equal(mongoose.connection.name, 'noir-test');
  await mongoose.connection.dropDatabase();
  await User.create({
    email: 'customer@example.com',
    name: 'Casey Customer',
    role: 'customer',
    passwordHash: await hashPassword('customer-password-test'),
    isActive: true,
    placeholder: true,
  });
  await Product.create({
    id: 'priced-cable',
    slug: 'priced-cable',
    name: 'Priced cable',
    tagline: 'A stand-in cable.',
    price: 19,
    category: 'accessories',
    featured: false,
    flagship: false,
    active: true,
    placeholder: true,
    rating: 0,
    reviewCount: 0,
    colorways: [{ id: 'black', name: 'Black', price: 19, stockCount: 30, stock: 'in_stock' }],
  });
  await Product.create({
    id: 'race-item',
    slug: 'race-item',
    name: 'Race item',
    tagline: 'One left.',
    price: 10,
    category: 'parts',
    featured: false,
    flagship: false,
    active: true,
    placeholder: true,
    rating: 0,
    reviewCount: 0,
    colorways: [{ id: 'black', name: 'Black', price: 10, stockCount: 1, stock: 'in_stock' }],
  });
  await Product.create({
    id: 'hidden-item',
    slug: 'hidden-item',
    name: 'Hidden item',
    tagline: 'Archived.',
    price: 10,
    category: 'parts',
    featured: false,
    flagship: false,
    active: false,
    placeholder: true,
    rating: 0,
    reviewCount: 0,
    colorways: [{ id: 'black', name: 'Black', price: 10, stockCount: 4, stock: 'in_stock' }],
  });
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDb();
});

test('register ignores a requested role, and login stays generic', async () => {
  const session = await agent();
  const created = await session.client
    .post('/api/auth/register')
    .set('x-csrf-token', session.token)
    .send({
      name: 'New Buyer',
      email: 'new.buyer@example.com',
      password: 'register-password-1',
      role: 'admin',
    });
  assert.equal(created.status, 201);
  assert.equal(created.body.role, 'customer');
  assert.equal(created.body.guestOrderCount, 0);
  assert.equal(Object.hasOwn(created.body, 'passwordHash'), false);

  const unknown = await signIn('nobody@example.com', 'not-the-password');
  const wrong = await signIn('new.buyer@example.com', 'not-the-password');
  assert.equal(unknown.res.status, 401);
  assert.equal(wrong.res.status, 401);
  assert.equal(unknown.res.body.error, wrong.res.body.error);
});

test('forgot password uses one message, and the link is only logged', async () => {
  const notes = [];
  const original = console.info;
  console.info = (message) => notes.push(String(message));
  try {
    const unknown = await agent();
    const hidden = await unknown.client
      .post('/api/auth/forgot')
      .set('x-csrf-token', unknown.token)
      .send({ email: 'nobody@example.com' });
    const known = await agent();
    const shown = await known.client
      .post('/api/auth/forgot')
      .set('x-csrf-token', known.token)
      .send({ email: 'customer@example.com' });
    assert.equal(hidden.status, 200);
    assert.equal(shown.status, 200);
    assert.equal(hidden.body.message, shown.body.message);
    assert.equal(JSON.stringify(hidden.body).includes('token'), false);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].includes('customer@example.com'), false);
    const token = notes[0].split('token=')[1];
    assert.ok(token);

    const reset = await agent();
    const changed = await reset.client
      .post('/api/auth/reset')
      .set('x-csrf-token', reset.token)
      .send({ token, password: 'reset-password-12' });
    assert.equal(changed.status, 200);
    const oldPassword = await signIn('customer@example.com', 'customer-password-test');
    const newPassword = await signIn('customer@example.com', 'reset-password-12');
    assert.equal(oldPassword.res.status, 401);
    assert.equal(newPassword.res.status, 200);
  } finally {
    console.info = original;
  }
});

test('the shop list hides archived products and can filter', async () => {
  const all = await request(app).get('/api/products');
  assert.equal(all.status, 200);
  const ids = all.body.products.map((item) => item.id);
  assert.ok(ids.includes('priced-cable'));
  assert.equal(ids.includes('hidden-item'), false);
  const filtered = await request(app).get('/api/products?category=accessories&max=50');
  assert.deepEqual(filtered.body.products.map((item) => item.id), ['priced-cable']);
});

test('a client price and a card number do not change the order', async () => {
  const session = await agent();
  const before = await Product.findOne({ id: 'priced-cable' });
  const res = await session.client
    .post('/api/orders')
    .set('x-csrf-token', session.token)
    .set('idempotency-key', 'price-tamper-key')
    .send({
      email: 'guest.price@example.com',
      cardNumber: '4242424242424242',
      lines: [{ productId: 'priced-cable', colorId: 'black', quantity: 1, unitPrice: 1 }],
      shippingAddress: shippingAddress(),
    });
  assert.equal(res.status, 201);
  assert.equal(res.body.items[0].unitPrice, 19);
  assert.equal(res.body.subtotal, 19);
  assert.equal(res.body.shipping, 12);
  assert.equal(res.body.total, 31);
  assert.equal(JSON.stringify(res.body).includes('4242'), false);
  const stored = await Order.findOne({ orderNumber: res.body.orderNumber });
  assert.equal(JSON.stringify(stored.toObject()).includes('4242'), false);
  assert.deepEqual(Object.keys(stored.payment.toObject()), ['provider', 'reference', 'status']);
  const after = await Product.findOne({ id: 'priced-cable' });
  assert.equal(after.colorways[0].stockCount, before.colorways[0].stockCount - 1);

  const again = await session.client
    .post('/api/orders')
    .set('x-csrf-token', session.token)
    .set('idempotency-key', 'price-tamper-key')
    .send({
      email: 'guest.price@example.com',
      lines: [{ productId: 'priced-cable', colorId: 'black', quantity: 1 }],
      shippingAddress: shippingAddress(),
    });
  assert.equal(again.status, 200);
  assert.equal(again.body.orderNumber, res.body.orderNumber);
  const finalCount = await Product.findOne({ id: 'priced-cable' });
  assert.equal(finalCount.colorways[0].stockCount, after.colorways[0].stockCount);
});

test('a declined payment reserves nothing', async () => {
  const session = await agent();
  const before = await Product.findOne({ id: 'priced-cable' });
  const res = await session.client
    .post('/api/orders')
    .set('x-csrf-token', session.token)
    .set('idempotency-key', 'decline-key-001')
    .send({
      email: 'guest.decline@example.com',
      outcome: 'decline',
      lines: [{ productId: 'priced-cable', colorId: 'black', quantity: 1 }],
      shippingAddress: shippingAddress(),
    });
  assert.equal(res.status, 402);
  const after = await Product.findOne({ id: 'priced-cable' });
  assert.equal(after.colorways[0].stockCount, before.colorways[0].stockCount);
  assert.equal(await Order.countDocuments({ email: 'guest.decline@example.com' }), 0);
});

test('two orders cannot take the last item', async () => {
  const first = await agent();
  const second = await agent();
  const body = {
    lines: [{ productId: 'race-item', colorId: 'black', quantity: 1 }],
    shippingAddress: shippingAddress(),
  };
  const [one, two] = await Promise.all([
    first.client.post('/api/orders').set('x-csrf-token', first.token).set('idempotency-key', 'race-key-one').send({ ...body, email: 'race.one@example.com' }),
    second.client.post('/api/orders').set('x-csrf-token', second.token).set('idempotency-key', 'race-key-two').send({ ...body, email: 'race.two@example.com' }),
  ]);
  const statuses = [one.status, two.status].sort();
  assert.deepEqual(statuses, [201, 409]);
  const product = await Product.findOne({ id: 'race-item' });
  assert.equal(product.colorways[0].stockCount, 0);
  assert.equal(product.colorways[0].stock, 'out_of_stock');
  assert.equal(await Order.countDocuments({ 'items.productId': 'race-item' }), 1);
});

test('guest orders can be looked up and then attached', async () => {
  const session = await agent();
  const placed = await session.client
    .post('/api/orders')
    .set('x-csrf-token', session.token)
    .set('idempotency-key', 'guest-attach-key')
    .send({
      email: 'guest.attach@example.com',
      lines: [{ productId: 'priced-cable', colorId: 'black', quantity: 3 }],
      shippingAddress: shippingAddress(),
    });
  assert.equal(placed.status, 201);
  assert.equal(placed.body.shipping, 0);
  assert.equal(placed.body.total, 57);

  const wrong = await session.client
    .post('/api/orders/lookup')
    .set('x-csrf-token', session.token)
    .send({ orderNumber: placed.body.orderNumber, email: 'other@example.com' });
  assert.equal(wrong.status, 404);
  const found = await session.client
    .post('/api/orders/lookup')
    .set('x-csrf-token', session.token)
    .send({ orderNumber: placed.body.orderNumber, email: 'guest.attach@example.com' });
  assert.equal(found.status, 200);
  assert.equal(found.body.orderNumber, placed.body.orderNumber);

  const registered = await session.client
    .post('/api/auth/register')
    .set('x-csrf-token', session.token)
    .send({ name: 'Guest Attach', email: 'guest.attach@example.com', password: 'attach-password-1' });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.guestOrderCount, 1);
  const attached = await session.client
    .post('/api/account/orders/attach')
    .set('x-csrf-token', session.token)
    .send({});
  assert.equal(attached.status, 200);
  assert.equal(attached.body.attached, 1);
  const list = await session.client.get('/api/account/orders');
  assert.equal(list.body.orders.length, 1);
  assert.equal(list.body.orders[0].orderNumber, placed.body.orderNumber);
});
