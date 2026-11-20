import { AuditLog } from '../models/AuditLog.js';

export function recordAudit({ actorId, action, target, before = '', after = '' }) {
  return AuditLog.create({
    actorId,
    action,
    target: String(target).slice(0, 200),
    before: String(before).slice(0, 500),
    after: String(after).slice(0, 500),
    placeholder: false,
  });
}
