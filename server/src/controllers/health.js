import { dbStatus } from '../db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const show = asyncHandler(async (_req, res) => {
  const db = dbStatus();
  const ok = db === 'connected';
  res.status(ok ? 200 : 503).json({ ok, db });
});
