import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from '../config/index.js';

export const SESSION_COOKIE = 'noir.sid';
export const CSRF_COOKIE = 'noir.csrf';
// A signed-in admin stays signed in for a week, then the cookie expires.
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function newToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.env === 'production',
    path: '/',
    maxAge: SESSION_MS,
  };
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'Lax',
    secure: config.env === 'production',
    path: '/',
    maxAge: SESSION_MS,
  };
}

function serialize(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || '/'}`);
  parts.push(`Max-Age=${Math.floor((options.maxAge ?? 0) / 1000)}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function setCookie(res, name, value, options) {
  res.append('Set-Cookie', serialize(name, value, options));
}

export function clearCookie(res, name, options) {
  setCookie(res, name, '', { ...options, maxAge: 0 });
}

export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return '';
  for (const part of header.split(';')) {
    const text = part.trim();
    const eq = text.indexOf('=');
    if (eq === -1) continue;
    if (text.slice(0, eq) !== name) continue;
    return decodeURIComponent(text.slice(eq + 1));
  }
  return '';
}

export function tokensMatch(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
