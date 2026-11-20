import { HttpError } from '../utils/httpError.js';
import { CSRF_COOKIE, readCookie, tokensMatch } from '../utils/session.js';

export function requireAuth(req, res, next) {
  if (!req.user) {
    next(new HttpError(401, 'Sign in required.'));
    return;
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    next(new HttpError(401, 'Sign in required.'));
    return;
  }
  if (req.user.role !== 'admin') {
    next(new HttpError(403, 'Admin access is required.'));
    return;
  }
  next();
}

export function requireCsrf(req, res, next) {
  const header = req.get('x-csrf-token') || '';
  const cookie = readCookie(req, CSRF_COOKIE);
  if (!tokensMatch(header, cookie)) {
    next(new HttpError(403, 'Missing or invalid CSRF token.'));
    return;
  }
  next();
}

export function requireCsrfForWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next();
    return;
  }
  requireCsrf(req, res, next);
}
