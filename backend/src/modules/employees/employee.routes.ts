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
import { EmployeeContact, EmployeeEducation, EmployeeExperience, EmployeeFamilyMember, EmployeeIdentity } from './employee-profile.model.js';

export const employeeRouter = Router();
employeeRouter.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_r, file, cb) => cb(null, file.mimetype.startsWith('image/')) });

const employeeSchema = z.object({
  employeeId: z.string().min(3).max(30).transform((v) => v.toUpperCase().trim()),
  legacyEmployeeId: z.string().max(30).optional(), candidateId: z.string().max(30).optional(),
  title: z.string().max(20).optional(), firstName: z.string().max(60).optional(), middleName: z.string().max(60).optional(), lastName: z.string().max(60).optional(),
  fullName: z.string().min(2).max(150),
  personal: z.record(z.string(), z.unknown()).optional(),
  employment: z.object({
    department: z.string(), section: z.string().nullable().optional(), designation: z.string(),
    grade: z.string().optional(), employeeType: z.enum(employeeTypes), joiningDate: z.coerce.date(),
    confirmationDate: z.coerce.date().optional(), probationStartDate: z.coerce.date().optional(), probationEndDate: z.coerce.date().optional(),
    contractStartDate: z.coerce.date().optional(), contractEndDate: z.coerce.date().optional(), retirementDate: z.coerce.date().optional(),
    resignationDate: z.coerce.date().optional(), terminationDate: z.coerce.date().optional(), status: z.enum(employmentStatuses).default('ACTIVE'),
    reportingManager: z.string().nullable().optional(), location: z.string().optional(), costCenter: z.string().optional(),
    workShift: z.string().optional(), contractNumber: z.string().optional()
  })
});

employeeRouter.get('/', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query);
  const search = String(request.query.search ?? '').trim();
  const filter: any = { ...employeeScope(request.auth!) };
  if (search) filter.$and = [{ $or: [{ employeeId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }] }];
  if (request.query.department) filter['employment.department'] = request.query.department;
  if (request.query.status) filter['employment.status'] = request.query.status;
  const [items, total] = await Promise.all([
    Employee.find(filter).select('-personal.nidOrPassport -employment.contractNumber').populate('employment.department employment.designation employment.reportingManager', 'name code employeeId fullName').sort({ fullName: 1 }).skip(skip).limit(limit),
    Employee.countDocuments(filter)
  ]);
  ok(response, items, { page, limit, total, pages: Math.ceil(total / limit) });
}));

employeeRouter.post('/', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  const input = employeeSchema.parse(request.body);
  if (input.employment.reportingManager && input.employment.reportingManager === request.body._id) throw new ApiError(422, 'Employee cannot report to themselves', 'INVALID_MANAGER');
  const employee = await Employee.create(input);
  await audit(request, 'EMPLOYEE_CREATED', 'Employee', employee._id, { employeeId: employee.employeeId });
  ok(response, employee, undefined, 201);
}));

employeeRouter.get('/:id', asyncHandler(async (request, response) => {
  await assertEmployeeAccess(request.auth!, String(request.params.id));
  let query = Employee.findById(request.params.id).populate('employment.department employment.section employment.designation employment.reportingManager', 'name code employeeId fullName');
  if (!['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role)) query = query.select('-personal.nidOrPassport -employment.contractNumber');
  const employee = await query;
  if (!employee) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  ok(response, employee);
}));

employeeRouter.get('/:id/profile-data', asyncHandler(async (request, response) => {
  await assertEmployeeAccess(request.auth!, String(request.params.id));
  const canViewIdentity = ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role);
  const [contact, identity, family, education, experience] = await Promise.all([
    EmployeeContact.findOne({ employee: request.params.id }),
    canViewIdentity ? EmployeeIdentity.findOne({ employee: request.params.id }) : null,
    EmployeeFamilyMember.find({ employee: request.params.id }).sort({ relationship: 1, name: 1 }),
    EmployeeEducation.find({ employee: request.params.id }).sort({ endYear: -1 }),
    EmployeeExperience.find({ employee: request.params.id }).sort({ endDate: -1 }),
  ]);
  ok(response, { contact, identity, family, education, experience, identityRestricted: !canViewIdentity });
}));

const addressInput = z.object({ houseRoadVillage: z.string().max(200).optional(), postOffice: z.string().max(100).optional(), postCode: z.string().max(20).optional(), district: z.string().max(100).optional(), upazila: z.string().max(100).optional(), line1: z.string().max(200).optional(), line2: z.string().max(200).optional(), country: z.string().max(100).optional() });
const contactInput = z.object({
  personalMobile: z.string().max(30).optional(), officialMobile: z.string().max(30).optional(), residentPhone: z.string().max(30).optional(),
  personalEmail: z.email().optional().or(z.literal('')), officialEmail: z.email().optional().or(z.literal('')),
  presentAddress: addressInput.optional(), permanentAddress: addressInput.optional(), sameAsPresent: z.boolean().optional(),
  emergencyContacts: z.array(z.object({ name: z.string().min(2).max(120), relationship: z.string().max(80).optional(), address: z.string().max(300).optional(), phone: z.string().min(3).max(30) })).max(2).optional(),
});

employeeRouter.put('/:id/profile-data/contact', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  if (!await Employee.exists({ _id: request.params.id })) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const input = contactInput.parse(request.body);
  const document = await EmployeeContact.findOneAndUpdate({ employee: request.params.id }, { ...input, employee: request.params.id }, { upsert: true, new: true, runValidators: true });
  await audit(request, 'EMPLOYEE_CONTACT_UPDATED', 'EmployeeContact', document._id, input);
  ok(response, document);
}));

const optionalDate = z.coerce.date().optional();
const identityInput = z.object({ nationalId: z.string().max(40).optional(), birthRegistrationNumber: z.string().max(40).optional(), eTin: z.string().max(40).optional(), identificationMarks: z.string().max(500).optional(), passport: z.object({ number: z.string().max(40).optional(), issueDate: optionalDate, expiryDate: optionalDate }).optional(), visa: z.object({ number: z.string().max(40).optional(), issueDate: optionalDate, expiryDate: optionalDate }).optional(), workPermit: z.object({ startDate: optionalDate, endDate: optionalDate }).optional() });
employeeRouter.put('/:id/profile-data/identity', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  if (!await Employee.exists({ _id: request.params.id })) throw new ApiError(404, 'Employee not found', 'NOT_FOUND');
  const input = identityInput.parse(request.body);
  const document = await EmployeeIdentity.findOneAndUpdate({ employee: request.params.id }, { ...input, employee: request.params.id }, { upsert: true, new: true, runValidators: true });
  await audit(request, 'EMPLOYEE_IDENTITY_UPDATED', 'EmployeeIdentity', document._id, { fields: Object.keys(input) });
  ok(response, document);
}));

employeeRouter.patch('/:id', requirePermission('employee:write'), asyncHandler(async (request, response) => {
  const input = employeeSchema.partial().parse(request.body);
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
