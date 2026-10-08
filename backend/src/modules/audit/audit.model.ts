import { Schema, model } from 'mongoose';

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  changes: { type: Schema.Types.Mixed, default: {} },
  context: {
    requestId: String,
    ip: String,
    userAgent: String
  }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false }, versionKey: false });

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
export const AuditLog = model('AuditLog', auditLogSchema);
