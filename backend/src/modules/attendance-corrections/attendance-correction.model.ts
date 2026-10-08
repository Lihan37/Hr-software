import { Schema, model } from 'mongoose';

const decisionSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, role: String,
  action: { type: String, enum: ['SUBMIT', 'APPROVE', 'REJECT', 'CANCEL'], required: true },
  comment: String, timestamp: { type: Date, default: Date.now }
}, { _id: false });

const correctionSchema = new Schema({
  attendance: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  originalValues: { checkIn: Date, checkOut: Date },
  requestedValues: { checkIn: Date, checkOut: Date },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING_MANAGER', index: true },
  submittedAt: { type: Date, default: Date.now },
  decisions: [decisionSchema]
}, { timestamps: true, optimisticConcurrency: true });

correctionSchema.index({ employee: 1, status: 1, createdAt: -1 });
export const AttendanceCorrection = model('AttendanceCorrection', correctionSchema);
