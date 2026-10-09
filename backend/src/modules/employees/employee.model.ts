import { Schema, model } from 'mongoose';
import { employmentTypes } from '../employee-lifecycle/lifecycle.model.js';

export const employeeTypes = ['PERMANENT', 'PROBATIONARY', 'CONTRACTUAL', 'CASUAL', 'INTERN', 'TRAINEE', 'UNSPECIFIED'] as const;
export const employmentStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'SEPARATED'] as const;

const addressSchema = new Schema({
  line1: String, line2: String, city: String, district: String, postalCode: String, country: { type: String, default: 'Bangladesh' }
}, { _id: false });

const fileSchema = new Schema({
  provider: { type: String, required: true }, storageKey: { type: String, required: true },
  url: { type: String, required: true }, mimeType: String, uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const employeeSchema = new Schema({
  employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  legacyEmployeeId: { type: String, trim: true, sparse: true },
  candidateId: { type: String, trim: true, sparse: true },
  title: { type: String, trim: true },
  firstName: { type: String, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  fullName: { type: String, required: true, trim: true, index: true },
  profilePhoto: fileSchema,
  personal: {
    fatherName: String, motherName: String, dateOfBirth: Date,
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'] },
    bloodGroup: String, nationality: String, religion: String,
    maritalStatus: { type: String, enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'UNDISCLOSED'] },
    heightCm: Number, weightKg: Number, specialSkills: String, nidOrPassport: { type: String, select: false },
    phone: String, personalEmail: { type: String, lowercase: true },
    presentAddress: addressSchema, permanentAddress: addressSchema,
    emergencyContact: { name: String, phone: String, relationship: String }
  },
  employment: {
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    section: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    designation: { type: Schema.Types.ObjectId, ref: 'Designation', required: true, index: true },
    grade: String,
    employeeType: { type: String, enum: employeeTypes, required: true },
    employmentType: { type: String, enum: employmentTypes, index: true },
    traineeId: { type: String, unique: true, sparse: true, immutable: true },
    originalTraineeId: { type: String, sparse: true, immutable: true },
    traineeType: { type: Schema.Types.ObjectId, ref: 'TraineeType', default: null, index: true },
    traineeStatus: { type: String, enum: ['ACTIVE', 'COMPLETED', 'CONVERTED', 'DROPPED'], default: null },
    traineeStartDate: Date, expectedCompletionDate: Date, traineeRemarks: String,
    joiningDate: { type: Date, required: true }, confirmationDate: Date,
    probationStartDate: Date, probationEndDate: Date, contractStartDate: Date, contractEndDate: Date,
    probationEndDateSource: { type: String, enum: ['AUTO_CALCULATED', 'MANUAL_OVERRIDE'] },
    probationEvaluationStatus: { type: String, enum: ['NOT_STARTED', 'PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINAL', 'COMPLETED'], default: 'NOT_STARTED' },
    probationCycle: { type: Number, min: 1, default: 1 }, contractNotes: String,
    probationDurationMonths: { type: Number, min: 1, max: 36 }, probationReminderDays: { type: Number, min: 0, max: 180 },
    contractReminderDays: { type: Number, min: 0, max: 365 }, traineeReminderDays: { type: Number, min: 0, max: 180 },
    retirementDate: Date, resignationDate: Date, terminationDate: Date,
    status: { type: String, enum: employmentStatuses, default: 'ACTIVE', index: true },
    reportingManager: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    location: String, locationRef: { type: Schema.Types.ObjectId, ref: 'Location', default: null, index: true }, costCenter: String, workShift: String, contractNumber: { type: String, select: false }
  }
}, { timestamps: true, optimisticConcurrency: true });

employeeSchema.index({ 'employment.department': 1, 'employment.status': 1 });
export const Employee = model('Employee', employeeSchema);
