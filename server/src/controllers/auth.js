import {
  changePassword,
  login,
  logout,
  openSession,
  presentUser,
  register,
  requestPasswordReset,
  resetPassword,
} from '../services/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  clearCookie,
  CSRF_COOKIE,
  csrfCookieOptions,
  newToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  setCookie,
} from '../utils/session.js';

const resetMessage = 'If that email is registered, a reset link is ready.';

export const issueCsrf = asyncHandler(async (_req, res) => {
  const token = newToken();
  setCookie(res, CSRF_COOKIE, token, csrfCookieOptions());
  res.json({ token });
});

export const loginUser = asyncHandler(async (req, res) => {
  const user = await login(req.validated.body);
  const token = await openSession(user);
  setCookie(res, SESSION_COOKIE, token, sessionCookieOptions());
  res.json(await presentUser(user));
});

export const logoutUser = asyncHandler(async (req, res) => {
  await logout(req.sessionDoc);
  clearCookie(res, SESSION_COOKIE, sessionCookieOptions());
  res.json({ ok: true });
});

export const currentUser = asyncHandler(async (req, res) => {
  res.json(await presentUser(req.user));
});

export const registerUser = asyncHandler(async (req, res) => {
  const user = await register(req.validated.body);
  const token = await openSession(user);
  setCookie(res, SESSION_COOKIE, token, sessionCookieOptions());
  res.status(201).json(await presentUser(user));
});

export const updatePassword = asyncHandler(async (req, res) => {
  await changePassword({
    userId: req.user._id,
    sessionId: req.sessionDoc._id,
    current: req.validated.body.current,
    next: req.validated.body.next,
  });
  res.json({ ok: true });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordReset(req.validated.body.email);
  res.json({ ok: true, message: resetMessage });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  await resetPassword(req.validated.body);
  res.json({ ok: true });
});
