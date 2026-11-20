import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

function limiter(max, skip) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    skip,
    handler: (req, res) => {
      res.status(429).json({ error: 'Too many requests' });
    },
  });
}

export const apiLimiter = limiter(config.rateLimitMax);
// Login and logout stay on the strict cap. Session checks do not consume it.
export const authLimiter = limiter(
  config.authRateLimitMax,
  (req) => req.method === 'GET' || req.method === 'HEAD',
);
