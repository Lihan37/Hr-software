import { Schema, model } from 'mongoose';

const fileSchema = new Schema({ provider: String, storageKey: String, url: String, mimeType: String, uploadedAt: Date }, { _id: false });
const decisionSchema = new Schema({ actor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, role: String, stage: { type: String, enum: ['EMPLOYEE', 'HOD', 'HR'], required: true }, action: { type: String, enum: ['SUBMIT', 'APPROVE', 'REJECT', 'RETURN', 'CANCEL'], required: true }, comment: String, timestamp: { type: Date, default: Date.now } }, { _id: false });

const leaveTypeSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true }, code: { type: String, required: true, unique: true, uppercase: true, trim: true }, description: String,
  active: { type: Boolean, default: true, index: true }, paid: { type: Boolean, default: true }, requiresAttachment: { type: Boolean, default: false },
  allowHalfDay: { type: Boolean, default: false }, defaultEntitlement: { type: Number, min: 0, default: 0 }, entitlementMode: { type: String, enum: ['ANNUAL', 'EARNED'], default: 'ANNUAL' }, version: { type: Number, min: 1, default: 1 }
}, { timestamps: true });
export const LeaveType = model('LeaveType', leaveTypeSchema);

const policySchema = new Schema({
  key: { type: String, default: 'DEFAULT', unique: true }, leaveYearStartMonth: { type: Number, default: 1, min: 1, max: 12 }, leaveYearStartDay: { type: Number, default: 1, min: 1, max: 31 },
  reservePendingBalance: { type: Boolean, default: true }, allowNegativeBalance: { type: Boolean, default: false }, halfDayEnabled: { type: Boolean, default: false },
  leaveDayCountingMode: { type: String, enum: ['UNCONFIGURED', 'CALENDAR_DAYS', 'SCHEDULED_DUTY_DAYS'], default: 'UNCONFIGURED' },
  probationAccrual: { enabled: { type: Boolean, default: false }, mode: { type: String, enum: ['UNCONFIGURED', 'DAILY', 'MONTHLY'], default: 'UNCONFIGURED' }, applicableLeaveCodes: [String], rounding: { type: String, enum: ['UNCONFIGURED', 'NONE', 'DOWN', 'NEAREST', 'UP'], default: 'UNCONFIGURED' } },
  weeklyCycle: { basis: { type: String, enum: ['UNCONFIGURED', 'SCHEDULED_DUTY_DAYS', 'ACTUAL_WORKED_DAYS'], default: 'UNCONFIGURED' } },
  chQualification: { enabled: { type: Boolean, default: false }, minimumWorkedMinutes: { type: Number, min: 0, default: null }, requiresPriorAuthorization: { type: Boolean, default: true }, availableDuringProbation: { type: Boolean, default: false } },
  version: { type: Number, min: 1, default: 1 }, updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });
export const LeavePolicy = model('LeavePolicy', policySchema);

const policyHistorySchema = new Schema({ policy: { type: Schema.Types.ObjectId, ref: 'LeavePolicy', required: true }, version: { type: Number, required: true }, snapshot: { type: Schema.Types.Mixed, required: true }, changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, reason: { type: String, required: true } }, { timestamps: true });
policyHistorySchema.index({ policy: 1, version: -1 }, { unique: true });
export const LeavePolicyHistory = model('LeavePolicyHistory', policyHistorySchema);

export const ledgerTransactionTypes = ['OPENING_BALANCE', 'ANNUAL_ENTITLEMENT', 'ACCRUAL_CREDIT', 'MANUAL_ADJUSTMENT', 'LEAVE_RESERVATION', 'RESERVATION_RELEASE', 'LEAVE_DEDUCTION', 'LEAVE_REVERSAL', 'CH_CREDIT', 'CH_REVERSAL', 'CARRY_FORWARD', 'EXPIRY', 'OPENING', 'ENTITLEMENT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'USAGE'] as const;
const ledgerSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }, leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true }, year: { type: Number, required: true, index: true }, type: { type: String, enum: ledgerTransactionTypes, required: true }, amount: { type: Number, required: true }, reason: { type: String, required: true },
  operationId: { type: String, sparse: true, unique: true, immutable: true }, sourceType: String, sourceId: { type: Schema.Types.ObjectId, default: null }, leaveRequest: { type: Schema.Types.ObjectId, ref: 'LeaveRequest', default: null }, actor: { type: Schema.Types.ObjectId, ref: 'User', required: true }, effectiveAt: { type: Date, default: Date.now }, metadata: Schema.Types.Mixed
}, { timestamps: true });
ledgerSchema.index({ employee: 1, leaveType: 1, year: 1, effectiveAt: 1 });
export const LeaveLedgerEntry = model('LeaveLedgerEntry', ledgerSchema);

const leaveRequestSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }, leaveType: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true }, startDate: { type: Date, required: true }, endDate: { type: Date, required: true }, partialDay: { type: String, enum: ['NONE'], default: 'NONE' }, requestedDays: { type: Number, required: true, min: 1 }, dayBreakdown: [{ year: Number, days: Number }],
  reason: { type: String, required: true, trim: true }, remarks: String, attachment: fileSchema, assignedHod: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_HOD', 'PENDING_HR', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED'], default: 'DRAFT', index: true }, decisions: [decisionSchema], cancellation: { reason: String, cancelledAt: Date, cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' } }, attendanceReconciledAt: Date
}, { timestamps: true, optimisticConcurrency: true });
leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1, status: 1 });
leaveRequestSchema.index({ assignedHod: 1, status: 1, createdAt: -1 });
export const LeaveRequest = model('LeaveRequest', leaveRequestSchema);

const weeklyHolidaySchema = new Schema({ employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }, date: { type: Date, required: true }, source: { type: String, enum: ['MANUAL', 'ROSTER', 'SYSTEM'], default: 'MANUAL' }, authorizedDuty: { type: Boolean, default: false }, active: { type: Boolean, default: true }, reason: String, createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
weeklyHolidaySchema.index({ employee: 1, date: 1 }, { unique: true });
export const WeeklyHolidaySchedule = model('WeeklyHolidaySchedule', weeklyHolidaySchema);

const chCreditSchema = new Schema({ employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }, holidayDate: { type: Date, required: true }, schedule: { type: Schema.Types.ObjectId, ref: 'WeeklyHolidaySchedule', required: true }, attendance: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true }, ledgerCredit: { type: Schema.Types.ObjectId, ref: 'LeaveLedgerEntry' }, ledgerReversal: { type: Schema.Types.ObjectId, ref: 'LeaveLedgerEntry' }, operationId: { type: String, required: true, unique: true, immutable: true }, status: { type: String, enum: ['PENDING_POLICY', 'CREDITED', 'REVERSED', 'HR_RESOLUTION_REQUIRED'], default: 'PENDING_POLICY' }, qualificationSnapshot: Schema.Types.Mixed, reason: String }, { timestamps: true });
export const CompensatoryHolidayCredit = model('CompensatoryHolidayCredit', chCreditSchema);

const leaveNotificationSchema = new Schema({ recipient: { type: Schema.Types.ObjectId, ref: 'User', default: null }, recipientRole: String, employee: { type: Schema.Types.ObjectId, ref: 'Employee', default: null }, type: { type: String, required: true }, entityId: { type: Schema.Types.ObjectId, required: true }, operationId: { type: String, required: true, unique: true }, title: { type: String, required: true }, message: { type: String, required: true }, readAt: Date }, { timestamps: true });
export const LeaveNotification = model('LeaveNotification', leaveNotificationSchema);
