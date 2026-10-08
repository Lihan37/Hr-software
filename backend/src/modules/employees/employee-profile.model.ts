import { Schema, model } from 'mongoose';

const addressSchema = new Schema({
  houseRoadVillage: String,
  postOffice: String,
  postCode: String,
  district: String,
  upazila: String,
  line1: String,
  line2: String,
  country: { type: String, default: 'Bangladesh' },
}, { _id: false });

const emergencySchema = new Schema({
  name: { type: String, required: true, trim: true },
  relationship: { type: String, trim: true },
  address: String,
  phone: { type: String, required: true, trim: true },
}, { _id: false });

const contactSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true, index: true },
  personalMobile: String,
  officialMobile: String,
  residentPhone: String,
  personalEmail: { type: String, lowercase: true, trim: true },
  officialEmail: { type: String, lowercase: true, trim: true },
  presentAddress: addressSchema,
  permanentAddress: addressSchema,
  sameAsPresent: { type: Boolean, default: false },
  emergencyContacts: { type: [emergencySchema], validate: [(items: unknown[]) => items.length <= 2, 'At most two emergency contacts are allowed'] },
}, { timestamps: true, optimisticConcurrency: true });
export const EmployeeContact = model('EmployeeContact', contactSchema);

const identitySchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true, index: true },
  nationalId: { type: String, trim: true },
  birthRegistrationNumber: { type: String, trim: true },
  passport: { number: String, issueDate: Date, expiryDate: Date },
  visa: { number: String, issueDate: Date, expiryDate: Date },
  workPermit: { startDate: Date, endDate: Date },
  eTin: { type: String, trim: true },
  identificationMarks: String,
}, { timestamps: true, optimisticConcurrency: true });
export const EmployeeIdentity = model('EmployeeIdentity', identitySchema);

const familySchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  relationship: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  occupation: String,
  dateOfBirth: Date,
  phone: String,
  dependent: { type: Boolean, default: false },
}, { timestamps: true });
familySchema.index({ employee: 1, relationship: 1, name: 1 });
export const EmployeeFamilyMember = model('EmployeeFamilyMember', familySchema);

const educationSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  qualification: { type: String, required: true, trim: true },
  institution: { type: String, required: true, trim: true },
  fieldOfStudy: String,
  startYear: Number,
  endYear: Number,
  result: String,
}, { timestamps: true });
educationSchema.index({ employee: 1, endYear: -1 });
export const EmployeeEducation = model('EmployeeEducation', educationSchema);

const experienceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employer: { type: String, required: true, trim: true },
  designation: { type: String, required: true, trim: true },
  startDate: Date,
  endDate: Date,
  responsibilities: String,
}, { timestamps: true });
experienceSchema.index({ employee: 1, endDate: -1 });
export const EmployeeExperience = model('EmployeeExperience', experienceSchema);
