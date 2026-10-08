import { Schema, model } from 'mongoose';

export const attendanceStatuses = ['PRESENT', 'ABSENT', 'LEAVE', 'WEEKLY_OFF', 'PUBLIC_HOLIDAY', 'MISSING_PUNCH'] as const;
export const attendanceSources = ['MANUAL', 'BIOMETRIC', 'IMPORT', 'SYSTEM'] as const;

const attendanceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  date: { type: Date, required: true },
  shift: String,
  scheduledStart: Date, scheduledEnd: Date, checkIn: Date, checkOut: Date,
  original: { checkIn: Date, checkOut: Date, source: String },
  lateMinutes: { type: Number, min: 0, default: 0 },
  earlyDepartureMinutes: { type: Number, min: 0, default: 0 },
  workedMinutes: { type: Number, min: 0, default: 0 },
  overtimeMinutes: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: attendanceStatuses, required: true, index: true },
  source: { type: String, enum: attendanceSources, required: true },
  notes: String,
  rawPunches: [{ type: Schema.Types.ObjectId, ref: 'BiometricPunch' }],
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  modificationReason: String
}, { timestamps: true, optimisticConcurrency: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });
export const Attendance = model('Attendance', attendanceSchema);
