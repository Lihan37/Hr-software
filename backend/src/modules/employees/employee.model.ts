import { Schema, model } from 'mongoose';

export const employeeTypes = ['PERMANENT', 'PROBATIONARY', 'CONTRACTUAL', 'CASUAL', 'INTERN', 'TRAINEE', 'UNSPECIFIED'] as const;
export const employmentStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'SEPARATED'] as const;

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
    joiningDate: { type: Date, required: true }, confirmationDate: Date,
    probationStartDate: Date, probationEndDate: Date, contractStartDate: Date, contractEndDate: Date,
    retirementDate: Date, resignationDate: Date, terminationDate: Date,
    status: { type: String, enum: employmentStatuses, default: 'ACTIVE', index: true },
    reportingManager: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    location: String, costCenter: String, workShift: String, contractNumber: { type: String, select: false }
  }
}, { timestamps: true, optimisticConcurrency: true });

employeeSchema.index({ 'employment.department': 1, 'employment.status': 1 });
export const Employee = model('Employee', employeeSchema);
