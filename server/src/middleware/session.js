import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { hashToken, readCookie, SESSION_COOKIE } from '../utils/session.js';

// Loads the session cookie into req.user. An inactive account is signed out
// on this request, so deactivation applies without waiting for the cookie to expire.
export async function loadSession(req, res, next) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token) {
      next();
      return;
    }
    const session = await Session.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      next();
      return;
    }
    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      next();
      return;
    }
    req.user = user;
    req.sessionDoc = session;
    next();
  } catch (error) {
    next(error);
  }
}
