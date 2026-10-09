import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { pagination } from '../../utils/pagination.js';
import { audit } from '../audit/audit.service.js';
import { storageService } from '../storage/cloudinary.provider.js';
import { assertEmployeeAccess, employeeScope } from './employee-access.js';
import { Employee, employeeTypes, employmentStatuses } from './employee.model.js';
import { EmployeeBankAccount, EmployeeContact, EmployeeEducation, EmployeeExperience, EmployeeFamilyMember, EmployeeIdentity } from './employee-profile.model.js';
import { employmentTypes, TraineeType } from '../employee-lifecycle/lifecycle.model.js';
import { addUtcMonths, getHrPolicy, lifecycleEvent, nextTraineeId } from '../employee-lifecycle/lifecycle.service.js';
import { Location } from '../organization/organization.model.js';

export const employeeRouter = Router();
employeeRouter.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_r, file, cb) => cb(null, file.mimetype.startsWith('image/')) });

const optionalDate = z.coerce.date().optional();
const addressInput = z.object({ houseRoadVillage: z.string().max(200).optional(), postOffice: z.string().max(100).optional(), postCode: z.string().max(20).optional(), district: z.string().max(100).optional(), upazila: z.string().max(100).optional(), line1: z.string().max(200).optional(), line2: z.string().max(200).optional(), country: z.string().max(100).optional() });
const emergencyInput = z.object({ name: z.string().min(2).max(120), relationship: z.string().max(80).optional(), address: z.string().max(300).optional(), phone: z.string().min(3).max(30) });
const contactInput = z.object({
  personalMobile: z.string().max(30).optional(), officialMobile: z.string().max(30).optional(), residentPhone: z.string().max(30).optional(),
  personalEmail: z.email().optional().or(z.literal('')), officialEmail: z.email().optional().or(z.literal('')),
  presentAddress: addressInput.optional(), permanentAddress: addressInput.optional(), sameAsPresent: z.boolean().optional(),
  emergencyContacts: z.array(emergencyInput).max(2).optional(),
});
const identityInput = z.object({ nationalId: z.string().max(40).optional(), birthRegistrationNumber: z.string().max(40).optional(), eTin: z.string().max(40).optional(), identificationMarks: z.string().max(500).optional(), passport: z.object({ number: z.string().max(40).optional(), issueDate: optionalDate, expiryDate: optionalDate }).optional(), visa: z.object({ number: z.string().max(40).optional(), issueDate: optionalDate, expiryDate: optionalDate }).optional(), workPermit: z.object({ startDate: optionalDate, endDate: optionalDate }).optional() });
const familyInput = z.object({ relationship: z.string().min(2).max(80), name: z.string().min(2).max(120), occupation: z.string().max(120).optional(), dateOfBirth: optionalDate, anniversaryDate: optionalDate, phone: z.string().max(30).optional(), dependent: z.boolean().optional() });
const bankInput = z.object({ bankName: z.string().max(120).optional(), branchName: z.string().max(120).optional(), accountName: z.string().max(150).optional(), accountNumber: z.string().max(50).optional(), routingNumber: z.string().max(50).optional(), accountType: z.enum(['SAVINGS', 'CURRENT', 'SALARY', 'OTHER']).optional(), mobileFinancialService: z.string().max(80).optional(), mobileAccountNumber: z.string().max(30).optional() });
const profileDataInput = z.object({ contact: contactInput.optional(), identity: identityInput.optional(), family: z.array(familyInput).max(10).optional(), bank: bankInput.optional() }).optional();

const employeeSchema = z.object({
  employeeId: z.string().min(3).max(30).transform((v) => v.toUpperCase().trim()).optional(),
  legacyEmployeeId: z.string().max(30).optional(), candidateId: z.string().max(30).optional(),
  title: z.string().max(20).optional(), firstName: z.string().max(60).optional(), middleName: z.string().max(60).optional(), lastName: z.string().max(60).optional(),
  fullName: z.string().min(2).max(150).optional(),
  personal: z.record(z.string(), z.unknown()).optional(),
  employment: z.object({
    department: z.string(), section: z.string().nullable().optional(), designation: z.string(),
    grade: z.string().optional(), employeeType: z.enum(employeeTypes).default('UNSPECIFIED'), employmentType: z.enum(employmentTypes), joiningDate: z.coerce.date(),
    traineeType: z.string().nullable().optional(), traineeStartDate: z.coerce.date().optional(), expectedCompletionDate: z.coerce.date().optional(), traineeRemarks: z.string().max(1000).optional(),
    confirmationDate: z.coerce.date().optional(), probationStartDate: z.coerce.date().optional(), probationEndDate: z.coerce.date().optional(),
    contractStartDate: z.coerce.date().optional(), contractEndDate: z.coerce.date().optional(), retirementDate: z.coerce.date().optional(),
    resignationDate: z.coerce.date().optional(), terminationDate: z.coerce.date().optional(), contractNotes: z.string().max(1000).optional(),
    probationDurationMonths: z.coerce.number().int().min(1).max(36).optional(), probationReminderDays: z.coerce.number().int().min(0).max(180).optional(), contractReminderDays: z.coerce.number().int().min(0).max(365).optional(), traineeReminderDays: z.coerce.number().int().min(0).max(180).optional(), status: z.enum(employmentStatuses).default('ACTIVE'),
    reportingManager: z.string().nullable().optional(), reviewer: z.string().nullable().optional(),
    employeeOf: z.string().max(120).optional(), divisionName: z.string().max(120).optional(), businessUnit: z.string().max(120).optional(), branch: z.string().max(120).optional(), subDepartment: z.string().max(120).optional(),
    location: z.string().optional(), locationRef: z.string().nullable().optional(), workforceType: z.enum(['LOCAL', 'EXPAT']).optional(), employeeCategory: z.string().max(100).optional(),
    jobDescription: z.string().max(2000).optional(), jobLevel: z.string().max(80).optional(), employeeBand: z.string().max(80).optional(), costCenter: z.string().max(100).optional(),
    actualJoiningDate: z.coerce.date().optional(), approvedPositionId: z.string().max(80).optional(), requisitionNo: z.string().max(80).optional(), joiningSource: z.string().max(100).optional(),
    timeAttendanceApplicable: z.boolean().optional(), workShift: z.string().max(120).optional(), dutySchedule: z.string().max(200).optional(), lockerNumber: z.string().max(80).optional(), dormitory: z.string().max(120).optional(), uniformApplicable: z.boolean().optional(),
    regionName: z.string().max(120).optional(), clusterName: z.string().max(120).optional(), depotName: z.string().max(120).optional(), territoryName: z.string().max(120).optional(), areaName: z.string().max(120).optional(),
    otherErpId: z.string().max(100).optional(), employmentRemarks: z.string().max(2000).optional(), contractNumber: z.string().optional()
  })
});

employeeRouter.get('/', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query);
  const search = String(request.query.search ?? '').trim();
  const filter: any = { ...employeeScope(request.auth!) };
  if (search) filter.$and = [{ $or: [{ employeeId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }] }];
  if (request.query.department) filter['employment.department'] = request.query.department;
  if (request.query.status) filter['employment.status'] = request.query.status;
  if (request.query.employmentType) filter['employment.employmentType'] = request.query.employmentType;
  if (request.query.traineeType) filter['employment.traineeType'] = request.query.traineeType;
  const [items, total] = await Promise.all([
    Employee.find(filter).select('-personal.nidOrPassport -employment.contractNumber').populate('employment.department employment.designation employment.reportingManager employment.reviewer employment.traineeType employment.locationRef', 'name code employeeId fullName timezone').sort({ fullName: 1 }).skip(skip).limit(limit),
    Employee.countDocuments(filter)
  ]);
  ok(response, items, { page, limit, total, pages: Math.ceil(total / limit) });
}));

employeeRouter.post('/', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  const input = employeeSchema.parse(request.body);
  const profileData = profileDataInput.parse(request.body.profileData);
  if (profileData?.bank && !['SUPER_ADMIN', 'HR_ADMIN'].includes(request.auth!.role)) throw new ApiError(403, 'Bank information requires HR administrator access', 'FORBIDDEN');
  if (!input.fullName) input.fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(' ').trim();
  if (!input.fullName) throw new ApiError(422, 'First or last name is required', 'EMPLOYEE_NAME_REQUIRED');
  const employment: any = input.employment;
  if (employment.employmentType === 'TRAINEE') {
    if (!employment.traineeType || !employment.traineeStartDate) throw new ApiError(422, 'Trainee type and start date are required', 'TRAINEE_FIELDS_REQUIRED');
    if (!await TraineeType.exists({ _id: employment.traineeType, isActive: true })) throw new ApiError(422, 'Trainee type is inactive or unavailable', 'INVALID_TRAINEE_TYPE');
    const traineeId = await nextTraineeId(employment.traineeStartDate.getUTCFullYear());
    employment.traineeId = traineeId; employment.originalTraineeId = traineeId; employment.traineeStatus = 'ACTIVE'; input.employeeId = `TRN-${traineeId}`;
  } else if (!input.employeeId) throw new ApiError(422, 'Employee ID is required for non-trainee employees', 'EMPLOYEE_ID_REQUIRED');
  if (employment.locationRef && !await Location.exists({ _id: employment.locationRef, active: true })) throw new ApiError(422, 'Location is inactive or unavailable', 'INVALID_LOCATION');
  if (employment.employmentType === 'PROBATION') {
    if (!employment.probationStartDate) throw new ApiError(422, 'Probation start date is required', 'PROBATION_START_REQUIRED');
    const policy: any = await getHrPolicy();
    if (employment.probationEndDate) employment.probationEndDateSource = 'MANUAL_OVERRIDE';
    else { employment.probationEndDate = addUtcMonths(employment.probationStartDate, employment.probationDurationMonths ?? policy.probationDurationMonths); employment.probationEndDateSource = 'AUTO_CALCULATED'; }
  }
  if (employment.employmentType === 'CONTRACTUAL') {
    if (!employment.contractStartDate || !employment.contractEndDate) throw new ApiError(422, 'Contract start and end dates are required', 'CONTRACT_DATES_REQUIRED');
    if (employment.contractEndDate <= employment.contractStartDate) throw new ApiError(422, 'Contract end must be after contract start', 'INVALID_CONTRACT_DATES');
  }
  const employee = await Employee.create(input);
  if (input.employment.reportingManager && String(input.employment.reportingManager) === String(employee._id)) { await employee.deleteOne(); throw new ApiError(422, 'Employee cannot report to themselves', 'INVALID_MANAGER'); }
  try {
    const writes: Promise<unknown>[] = [];
    if (profileData?.contact) writes.push(EmployeeContact.create({ ...profileData.contact, employee: employee._id }));
    if (profileData?.identity) writes.push(EmployeeIdentity.create({ ...profileData.identity, employee: employee._id }));
    if (profileData?.family?.length) writes.push(EmployeeFamilyMember.insertMany(profileData.family.map((member) => ({ ...member, employee: employee._id }))));
    if (profileData?.bank) writes.push(EmployeeBankAccount.create({ ...profileData.bank, employee: employee._id }));
    await Promise.all(writes);
  } catch (error) {
    await Promise.allSettled([EmployeeContact.deleteMany({ employee: employee._id }), EmployeeIdentity.deleteMany({ employee: employee._id }), EmployeeFamilyMember.deleteMany({ employee: employee._id }), EmployeeBankAccount.deleteMany({ employee: employee._id }), employee.deleteOne()]);
    throw error;
  }
  await lifecycleEvent(employee._id, employment.employmentType === 'TRAINEE' ? 'TRAINEE_CREATED' : 'EMPLOYEE_CREATED', request.auth!.sub, { newValue: { employmentType: employment.employmentType, employeeId: employee.employeeId, traineeId: employment.traineeId } });
  await audit(request, 'EMPLOYEE_CREATED', 'Employee', employee._id, { employeeId: employee.employeeId, profileSections: profileData ? Object.keys(profileData) : [] });
  ok(response, employee, undefined, 201);
}));

employeeRouter.get('/:id', asyncHandler(async (request, response) => {
  await assertEmployeeAccess(request.auth!, String(request.params.id));
  let query = Employee.findById(request.params.id).populate('employment.department employment.section employment.designation employment.reportingManager employment.reviewer employment.traineeType employment.locationRef', 'name code employeeId fullName timezone');
  if (!['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role)) query = query.select('-personal.nidOrPassport -employment.contractNumber');
  const employee = await query;
  if (!employee) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  ok(response, employee);
}));

employeeRouter.get('/:id/profile-data', asyncHandler(async (request, response) => {
  await assertEmployeeAccess(request.auth!, String(request.params.id));
  const canViewIdentity = ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role);
  const canViewBank = ['SUPER_ADMIN', 'HR_ADMIN'].includes(request.auth!.role);
  const [contact, identity, family, education, experience, bank] = await Promise.all([
    EmployeeContact.findOne({ employee: request.params.id }),
    canViewIdentity ? EmployeeIdentity.findOne({ employee: request.params.id }) : null,
    EmployeeFamilyMember.find({ employee: request.params.id }).sort({ relationship: 1, name: 1 }),
    EmployeeEducation.find({ employee: request.params.id }).sort({ endYear: -1 }),
    EmployeeExperience.find({ employee: request.params.id }).sort({ endDate: -1 }),
    canViewBank ? EmployeeBankAccount.findOne({ employee: request.params.id }).select('+accountNumber +routingNumber +mobileAccountNumber') : null,
  ]);
  ok(response, { contact, identity, family, education, experience, bank, identityRestricted: !canViewIdentity, bankRestricted: !canViewBank });
}));

employeeRouter.put('/:id/profile-data/contact', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  if (!await Employee.exists({ _id: request.params.id })) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const input = contactInput.parse(request.body);
  const document = await EmployeeContact.findOneAndUpdate({ employee: request.params.id }, { ...input, employee: request.params.id }, { upsert: true, new: true, runValidators: true });
  await audit(request, 'EMPLOYEE_CONTACT_UPDATED', 'EmployeeContact', document._id, input);
  ok(response, document);
}));

employeeRouter.put('/:id/profile-data/identity', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  if (!await Employee.exists({ _id: request.params.id })) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const input = identityInput.parse(request.body);
  const document = await EmployeeIdentity.findOneAndUpdate({ employee: request.params.id }, { ...input, employee: request.params.id }, { upsert: true, new: true, runValidators: true });
  await audit(request, 'EMPLOYEE_IDENTITY_UPDATED', 'EmployeeIdentity', document._id, { fields: Object.keys(input) });
  ok(response, document);
}));

employeeRouter.put('/:id/profile-data/family', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  if (!await Employee.exists({ _id: request.params.id })) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const input = z.array(familyInput).max(10).parse(request.body);
  await EmployeeFamilyMember.deleteMany({ employee: request.params.id });
  const documents = input.length ? await EmployeeFamilyMember.insertMany(input.map((member) => ({ ...member, employee: request.params.id }))) : [];
  await audit(request, 'EMPLOYEE_FAMILY_UPDATED', 'Employee', String(request.params.id), { count: documents.length });
  ok(response, documents);
}));

employeeRouter.put('/:id/profile-data/bank', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  if (!['SUPER_ADMIN', 'HR_ADMIN'].includes(request.auth!.role)) throw new ApiError(403, 'Bank information requires HR administrator access', 'FORBIDDEN');
  if (!await Employee.exists({ _id: request.params.id })) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const input = bankInput.parse(request.body);
  const document = await EmployeeBankAccount.findOneAndUpdate({ employee: request.params.id }, { ...input, employee: request.params.id }, { upsert: true, new: true, runValidators: true }).select('+accountNumber +routingNumber +mobileAccountNumber');
  await audit(request, 'EMPLOYEE_BANK_UPDATED', 'EmployeeBankAccount', document._id, { fields: Object.keys(input) });
  ok(response, document);
}));

employeeRouter.patch('/:id', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  const input = employeeSchema.partial().extend({ employment: employeeSchema.shape.employment.partial().optional() }).parse(request.body);
  if (input.employment?.employmentType || input.employment?.traineeType) throw new ApiError(422, 'Use the controlled lifecycle workflow to change employment or trainee type', 'LIFECYCLE_WORKFLOW_REQUIRED');
  if (input.employment?.reportingManager === request.params.id) throw new ApiError(422, 'Employee cannot report to themselves', 'INVALID_MANAGER');
  const employee = await Employee.findByIdAndUpdate(request.params.id, input, { new: true, runValidators: true });
  if (!employee) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  await audit(request, 'EMPLOYEE_UPDATED', 'Employee', employee._id, input);
  ok(response, employee);
}));

employeeRouter.post('/:id/photo', requirePermission('employee:write'), upload.single('photo'), asyncHandler(async (request, response) => {
  if (!request.file) throw new ApiError(422, 'An image file is required', 'VALIDATION_ERROR');
  const employee = await Employee.findById(request.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const previous = employee.profilePhoto?.storageKey;
  const stored = await storageService.upload(request.file.buffer, { folder: `hrms/employees/${employee.employeeId}`, mimeType: request.file.mimetype });
  employee.profilePhoto = stored as any; await employee.save();
  if (previous) await storageService.delete(previous).catch(() => undefined);
  await audit(request, 'EMPLOYEE_PHOTO_UPDATED', 'Employee', employee._id, { provider: stored.provider, storageKey: stored.storageKey });
  ok(response, employee.profilePhoto);
}));
