import { HttpError } from '../utils/httpError.js';

const BLOCKED = new Set(['__proto__', 'prototype', 'constructor']);

function assertClean(value) {
  if (Array.isArray(value)) {
    value.forEach(assertClean);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || BLOCKED.has(key)) {
      throw new HttpError(400, 'Invalid request field');
    }
    assertClean(value[key]);
  }
}

// Rejects query and body keys that Mongo would treat as operators.
export function sanitize(req, res, next) {
  try {
    assertClean(req.body);
    assertClean(req.query);
    assertClean(req.params);
    next();
  } catch (err) {
    next(err);
  }
}
