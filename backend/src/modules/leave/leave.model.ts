import { Schema, model } from 'mongoose';

const fileSchema = new Schema({ provider: String, storageKey: String, url: String, mimeType: String, uploadedAt: Date }, { _id: false });
const decisionSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, role: String,
  action: { type: String, enum: ['SUBMIT', 'APPROVE', 'REJECT', 'CANCEL'], required: true },
  comment: String, timestamp: { type: Date, default: Date.now }
}, { _id: false });

const leaveTypeSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String, active: { type: Boolean, default: true, index: true },
  paid: { type: Boolean, default: true }, requiresAttachment: { type: Boolean, default: false },
  allowHalfDay: { type: Boolean, default: false }, defaultEntitlement: { type: Number, min: 0, default: 0 }
}, { timestamps: true });
export const LeaveType = model('LeaveType', leaveTypeSchema);

const ledgerSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
  year: { type: Number, required: true, index: true },
  type: { type: String, enum: ['OPENING', 'ENTITLEMENT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'USAGE'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  leaveRequest: { type: Schema.Types.ObjectId, ref: 'LeaveRequest', default: null },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  effectiveAt: { type: Date, default: Date.now }
}, { timestamps: true });
ledgerSchema.index({ employee: 1, leaveType: 1, year: 1, effectiveAt: 1 });
export const LeaveLedgerEntry = model('LeaveLedgerEntry', ledgerSchema);

const leaveRequestSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
  startDate: { type: Date, required: true }, endDate: { type: Date, required: true },
  partialDay: { type: String, enum: ['NONE', 'FIRST_HALF', 'SECOND_HALF'], default: 'NONE' },
  requestedDays: { type: Number, required: true, min: 0.5 },
  reason: { type: String, required: true, trim: true }, attachment: fileSchema,
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'DRAFT', index: true },
  decisions: [decisionSchema]
}, { timestamps: true, optimisticConcurrency: true });
leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1, status: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });
export const LeaveRequest = model('LeaveRequest', leaveRequestSchema);
