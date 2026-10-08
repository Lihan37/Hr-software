import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { pagination } from '../../utils/pagination.js';
import { audit } from '../audit/audit.service.js';
import { Employee } from '../employees/employee.model.js';
import { Attendance, attendanceSources, attendanceStatuses } from './attendance.model.js';
import { calculateAttendance, utcDay } from './attendance.policy.js';

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

function accessFilter(auth: NonNullable<Express.Request['auth']>) {
  if (['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(auth.role)) return {};
  if (!auth.employeeId) throw new ApiError(403, 'No employee profile linked', 'PROFILE_NOT_LINKED');
  return auth.role === 'MANAGER' ? { employee: { $in: [auth.employeeId] } } : { employee: auth.employeeId };
}

const inputSchema = z.object({
  employee: z.string(), date: z.coerce.date(), scheduledStart: z.coerce.date().optional(), scheduledEnd: z.coerce.date().optional(),
  checkIn: z.coerce.date().optional(), checkOut: z.coerce.date().optional(), status: z.enum(attendanceStatuses).optional(),
  source: z.enum(attendanceSources).default('MANUAL'), notes: z.string().max(500).optional(), modificationReason: z.string().min(3).max(500)
});

attendanceRouter.get('/', asyncHandler(async (request, response) => {
  const { page, limit, skip } = pagination(request.query);
  const filter: any = accessFilter(request.auth!);
  if (request.auth!.role === 'MANAGER' && request.auth!.employeeId) {
    const reports = await Employee.find({ 'employment.reportingManager': request.auth!.employeeId }).distinct('_id');
    filter.employee = { $in: [request.auth!.employeeId, ...reports] };
  }
  if (request.query.employee && ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role)) {
    filter.employee = request.query.employee;
  }
  if (request.query.from || request.query.to) filter.date = { ...(request.query.from ? { $gte: utcDay(String(request.query.from)) } : {}), ...(request.query.to ? { $lte: utcDay(String(request.query.to)) } : {}) };
  const [items, total] = await Promise.all([
    Attendance.find(filter).populate('employee', 'employeeId fullName').sort({ date: -1 }).skip(skip).limit(limit),
    Attendance.countDocuments(filter)
  ]);
  ok(response, items, { page, limit, total, pages: Math.ceil(total / limit) });
}));

attendanceRouter.post('/', requirePermission('attendance:write'), asyncHandler(async (request, response) => {
  const input = inputSchema.parse(request.body);
  const calculated = calculateAttendance(input);
  const attendance = await Attendance.create({ ...input, date: utcDay(input.date), ...calculated, ...(input.status ? { status: input.status } : {}), lastModifiedBy: request.auth!.sub });
  await audit(request, 'ATTENDANCE_CREATED', 'Attendance', attendance._id, { ...input, calculated });
  ok(response, attendance, undefined, 201);
}));

attendanceRouter.patch('/:id', requirePermission('attendance:write'), asyncHandler(async (request, response) => {
  const input = inputSchema.partial().extend({ modificationReason: z.string().min(3) }).parse(request.body);
  const current = await Attendance.findById(request.params.id);
  if (!current) throw new ApiError(404, 'Attendance not found', 'NOT_FOUND');
  const nextValues = { scheduledStart: input.scheduledStart ?? current.scheduledStart, scheduledEnd: input.scheduledEnd ?? current.scheduledEnd, checkIn: input.checkIn ?? current.checkIn, checkOut: input.checkOut ?? current.checkOut };
  const calculated = calculateAttendance(nextValues as any);
  if (!current.original?.checkIn && !current.original?.checkOut) current.original = { checkIn: current.checkIn, checkOut: current.checkOut, source: current.source } as any;
  Object.assign(current, input, calculated, input.status ? { status: input.status } : {}, { lastModifiedBy: request.auth!.sub });
  await current.save();
  await audit(request, 'ATTENDANCE_UPDATED', 'Attendance', current._id, { before: nextValues, requested: input, calculated });
  ok(response, current);
}));

attendanceRouter.post('/clock', asyncHandler(async (request, response) => {
  if (!request.auth!.employeeId) throw new ApiError(403, 'No employee profile linked', 'PROFILE_NOT_LINKED');
  const action = z.object({ action: z.enum(['IN', 'OUT']) }).parse(request.body).action;
  const now = new Date(); const date = utcDay(now);
  let record = await Attendance.findOne({ employee: request.auth!.employeeId, date });
  if (!record) record = new Attendance({ employee: request.auth!.employeeId, date, source: 'SYSTEM', status: 'MISSING_PUNCH' });
  if (action === 'IN') {
    if (record.checkIn) throw new ApiError(409, 'Already checked in today', 'ALREADY_CLOCKED_IN');
    record.checkIn = now;
  } else {
    if (!record.checkIn) throw new ApiError(409, 'Check in before checking out', 'CHECK_IN_REQUIRED');
    if (record.checkOut) throw new ApiError(409, 'Already checked out today', 'ALREADY_CLOCKED_OUT');
    record.checkOut = now;
  }
  Object.assign(record, calculateAttendance({ checkIn: record.checkIn ?? undefined, checkOut: record.checkOut ?? undefined, scheduledStart: record.scheduledStart ?? undefined, scheduledEnd: record.scheduledEnd ?? undefined }));
  await record.save();
  await audit(request, `ATTENDANCE_CLOCK_${action}`, 'Attendance', record._id, { timestamp: now });
  ok(response, record);
}));
