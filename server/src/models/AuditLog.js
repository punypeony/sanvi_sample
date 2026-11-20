import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, maxlength: 80 },
    target: { type: String, required: true, maxlength: 200 },
    before: { type: String, default: '', maxlength: 500 },
    after: { type: String, default: '', maxlength: 500 },
    placeholder: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: 'auditLogs' },
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
