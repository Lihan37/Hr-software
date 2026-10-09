import { Schema, model } from 'mongoose';

export const employmentTypes = ['PROBATION', 'PERMANENT', 'CONTRACTUAL', 'TRAINEE'] as const;

const traineeTypeSchema = new Schema({ name: { type: String, required: true, unique: true, trim: true }, code: { type: String, required: true, unique: true, uppercase: true, trim: true }, description: String, isActive: { type: Boolean, default: true, index: true } }, { timestamps: true });
export const TraineeType = model('TraineeType', traineeTypeSchema);

const sequenceSchema = new Schema({ key: { type: String, required: true, unique: true }, value: { type: Number, required: true, default: 0 } }, { timestamps: true });
export const Sequence = model('Sequence', sequenceSchema);

const policySchema = new Schema({ key: { type: String, default: 'DEFAULT', unique: true }, probationDurationMonths: { type: Number, min: 1, max: 36, default: 4 }, probationEvaluationReminderDays: { type: Number, min: 0, max: 180, default: 7 }, contractExpiryReminderDays: { type: Number, min: 0, max: 365, default: 30 }, traineeCompletionReminderDays: { type: Number, min: 0, max: 180, default: 7 }, timezone: { type: String, default: 'Asia/Dhaka' } }, { timestamps: true });
export const HrPolicy = model('HrPolicy', policySchema);

const ratingSchema = new Schema({ criterion: { type: String, required: true }, rating: { type: Number, required: true, min: 1, max: 5 }, comment: String }, { _id: false });
const evaluationSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }, probationCycle: { type: Number, required: true, default: 1 }, evaluator: { type: Schema.Types.ObjectId, ref: 'User', required: true }, evaluatorRole: String,
  ratings: [ratingSchema], strengths: String, areasForImprovement: String, managerComments: String, hrComments: String,
  recommendation: { type: String, enum: ['CONFIRM_PERMANENT', 'EXTEND_PROBATION', 'TERMINATE', 'OTHER'], required: true },
  status: { type: String, enum: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINAL', 'COMPLETED'], required: true, index: true }, finalDecision: String, completedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });
evaluationSchema.index({ employee: 1, probationCycle: 1 }, { unique: true });
export const ProbationEvaluation = model('ProbationEvaluation', evaluationSchema);

const lifecycleSchema = new Schema({ employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true }, eventType: { type: String, required: true, index: true }, effectiveDate: { type: Date, required: true, default: Date.now }, previousValue: Schema.Types.Mixed, newValue: Schema.Types.Mixed, reason: String, performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }, metadata: Schema.Types.Mixed }, { timestamps: true });
lifecycleSchema.index({ employee: 1, effectiveDate: -1 });
export const EmployeeLifecycleEvent = model('EmployeeLifecycleEvent', lifecycleSchema);

const notificationSchema = new Schema({ recipientRole: { type: String, required: true, index: true }, type: { type: String, enum: ['PROBATION_EVALUATION_DUE', 'CONTRACT_EXPIRY_APPROACHING', 'TRAINEE_COMPLETION_DUE'], required: true }, entityType: { type: String, required: true }, entityId: { type: Schema.Types.ObjectId, required: true }, cycleKey: { type: String, required: true }, title: { type: String, required: true }, message: { type: String, required: true }, status: { type: String, enum: ['DUE_SOON', 'DUE_TODAY', 'OVERDUE', 'COMPLETED'], required: true, index: true }, dueDate: Date, readAt: Date, metadata: Schema.Types.Mixed }, { timestamps: true });
notificationSchema.index({ recipientRole: 1, type: 1, entityId: 1, cycleKey: 1 }, { unique: true });
notificationSchema.index({ recipientRole: 1, readAt: 1, createdAt: -1 });
export const Notification = model('Notification', notificationSchema);
