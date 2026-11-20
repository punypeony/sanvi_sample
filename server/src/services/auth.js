import { HttpError } from '../utils/httpError.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendPasswordReset } from '../providers/email.js';
import { countGuestOrders } from './orders.js';
import { hashToken, newToken, SESSION_MS } from '../utils/session.js';

const RESET_MS = 30 * 60 * 1000;
let dummyHash = '';

async function passwordMatches(user, password) {
  if (!dummyHash) dummyHash = await hashPassword('not-a-real-password');
  try {
    return await verifyPassword(user?.passwordHash || dummyHash, password);
  } catch {
    return false;
  }
}

export function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    addresses: (user.addresses || []).map((item) => ({
      label: item.label,
      line1: item.line1,
      city: item.city,
      region: item.region,
      postal: item.postal,
      country: item.country,
    })),
  };
}

export async function presentUser(user) {
  return {
    ...publicUser(user),
    guestOrderCount: await countGuestOrders(user.email),
  };
}

export async function openSession(user) {
  const token = newToken();
  await Session.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  return token;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  const matches = await passwordMatches(user, password);
  if (!user || !user.isActive || !matches) {
    throw new HttpError(401, 'Email or password is wrong.');
  }
  return user;
}

export async function logout(sessionDoc) {
  if (sessionDoc) await Session.deleteOne({ _id: sessionDoc._id });
}

export async function register({ name, email, password }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new HttpError(409, 'An account with that email already exists.');
  try {
    return await User.create({
      email,
      name,
      passwordHash: await hashPassword(password),
      role: 'customer',
      isActive: true,
      placeholder: false,
    });
  } catch (error) {
    if (error?.code === 11000 || error?.cause?.code === 11000) {
      throw new HttpError(409, 'An account with that email already exists.');
    }
    throw error;
  }
}

export async function changePassword({ userId, sessionId, current, next }) {
  const user = await User.findById(userId).select('+passwordHash');
  const matches = await verifyPassword(user.passwordHash, current);
  if (!matches) throw new HttpError(400, 'The current password is wrong.');
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash: await hashPassword(next) },
      $unset: { resetTokenHash: 1, resetExpires: 1 },
    },
  );
  await Session.deleteMany({ userId: user._id, _id: { $ne: sessionId } });
}

export async function requestPasswordReset(email) {
  const normalized = email.toLowerCase();
  const user = await User.findOne({ email: normalized, isActive: true });
  if (!user) return;
  const token = newToken();
  await User.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: hashToken(token), resetExpires: new Date(Date.now() + RESET_MS) } },
  );
  sendPasswordReset({ email: normalized, token });
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetExpires: { $gt: new Date() },
    isActive: true,
  });
  if (!user) throw new HttpError(400, 'That reset link is invalid or expired.');
  await User.updateOne(
    { _id: user._id },
    {
      $set: { passwordHash: await hashPassword(password) },
      $unset: { resetTokenHash: 1, resetExpires: 1 },
    },
  );
  await Session.deleteMany({ userId: user._id });
}
