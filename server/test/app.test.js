import assert from 'node:assert/strict';
import express from 'express';
import { before, test } from 'node:test';
import request from 'supertest';
import { z } from 'zod';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/noir-test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-test-secret-test-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.AUTH_RATE_LIMIT_MAX = '2';
process.env.RATE_LIMIT_MAX = '1000';
process.env.PORT = '4000';

const { createApp } = await import('../src/app.js');
const { errorHandler } = await import('../src/middleware/error.js');
const { validate } = await import('../src/middleware/validate.js');

const app = createApp();

before(() => {
  process.env.NODE_ENV = 'test';
});

test('GET /api/health reports the database', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.deepEqual(res.body, { ok: false, db: 'disconnected' });
  assert.equal(res.body.stack, undefined);
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('a foreign origin is not allowed', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'http://evil.example');
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('the shop origin is allowed', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
});

test('query operators are rejected', async () => {
  const res = await request(app).get('/api/health').query({ price: { $gt: '1' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid request field');
});

test('unknown routes are JSON', async () => {
  const res = await request(app).get('/api/missing');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not found' });
});

test('auth routes use the stricter limit', async () => {
  const first = await request(app).post('/api/auth/login');
  const second = await request(app).post('/api/auth/login');
  const third = await request(app).post('/api/auth/login');
  assert.equal(first.status, 403);
  assert.equal(second.status, 403);
  assert.equal(third.status, 429);
  assert.equal(third.body.error, 'Too many requests');
});

test('zod rejects an invalid body', async () => {
  const probe = express();
  probe.use(express.json());
  probe.post(
    '/echo',
    validate(z.object({ body: z.object({ name: z.string().min(1) }), query: z.object({}).optional(), params: z.object({}).optional() })),
    (req, res) => res.json(req.validated.body),
  );
  probe.use(errorHandler);

  const bad = await request(probe).post('/echo').send({ name: '' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, 'Invalid request');

  const good = await request(probe).post('/echo').send({ name: 'Noir' });
  assert.equal(good.status, 200);
  assert.deepEqual(good.body, { name: 'Noir' });
});

test('production errors omit the stack', () => {
  process.env.NODE_ENV = 'production';
  const sent = {};
  const res = {
    headersSent: false,
    status(code) {
      sent.status = code;
      return this;
    },
    json(body) {
      sent.body = body;
    },
  };
  errorHandler(new Error('boom'), {}, res, () => {});
  process.env.NODE_ENV = 'test';
  assert.equal(sent.status, 500);
  assert.equal(sent.body.error, 'Internal error');
  assert.equal(sent.body.stack, undefined);
});
