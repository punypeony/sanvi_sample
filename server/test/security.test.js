import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/noir-test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-test-secret-test-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.AUTH_RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_MAX = '1000';
process.env.PORT = '4000';

const { createApp } = await import('../src/app.js');

const app = createApp();

const checkout = {
  email: 'buyer@example.com',
  lines: [{ productId: 'priced-cable', colorId: 'black', quantity: 1 }],
  shippingAddress: {
    name: 'Buyer',
    line1: '1 Road',
    city: 'Portland',
    region: 'Oregon',
    postal: '97209',
    country: 'United States',
  },
  unitPrice: 1,
};

test('helmet sets the baseline response headers', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.match(String(res.headers['referrer-policy']), /no-referrer/);
  assert.match(String(res.headers['content-security-policy']), /default-src/);
});

test('a checkout without the CSRF header is rejected', async () => {
  const res = await request(app).post('/api/orders').send(checkout);
  assert.equal(res.status, 403);
  assert.equal(res.body.error, 'Missing or invalid CSRF token.');
});

test('checkout refuses a missing idempotency key before it prices the cart', async () => {
  const client = request.agent(app);
  const csrf = await client.get('/api/auth/csrf');
  assert.equal(csrf.status, 200);
  const res = await client
    .post('/api/orders')
    .set('x-csrf-token', csrf.body.token)
    .send(checkout);
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Missing idempotency key.');
});
