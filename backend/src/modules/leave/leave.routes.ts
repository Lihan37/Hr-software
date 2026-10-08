import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { audit } from '../audit/audit.service.js';
import { Attendance } from '../attendance/attendance.model.js';
import { utcDay } from '../attendance/attendance.policy.js';
import { Employee } from '../employees/employee.model.js';
import { LeaveLedgerEntry, LeaveRequest, LeaveType } from './leave.model.js';
import { calculateRequestedDays, nextLeaveStatus, summarizeLedger } from './leave.policy.js';

export const leaveRouter = Router(); leaveRouter.use(authenticate);
const typeSchema = z.object({ name: z.string().min(2), code: z.string().min(2), description: z.string().optional(), active: z.boolean().optional(), paid: z.boolean(), requiresAttachment: z.boolean(), allowHalfDay: z.boolean(), defaultEntitlement: z.number().min(0) });

leaveRouter.get('/types', asyncHandler(async (_request, response) => ok(response, await LeaveType.find().sort({ name: 1 }))));
leaveRouter.post('/types', requirePermission('leave:configure'), asyncHandler(async (request, response) => {
  const item = await LeaveType.create(typeSchema.parse(request.body)); await audit(request, 'LEAVE_TYPE_CREATED', 'LeaveType', item._id, request.body); ok(response, item, undefined, 201);
}));
leaveRouter.patch('/types/:id', requirePermission('leave:configure'), asyncHandler(async (request, response) => {
  const item = await LeaveType.findByIdAndUpdate(request.params.id, typeSchema.partial().parse(request.body), { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'Leave type not found', 'NOT_FOUND'); await audit(request, 'LEAVE_TYPE_UPDATED', 'LeaveType', item._id, request.body); ok(response, item);
}));

leaveRouter.get('/balances', asyncHandler(async (request, response) => {
  const employee = String(request.query.employee ?? request.auth!.employeeId ?? '');
  if (!employee) throw new ApiError(422, 'Employee is required', 'VALIDATION_ERROR');
  if (employee !== request.auth!.employeeId && !['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role)) throw new ApiError(403, 'Cannot view another employee balance', 'FORBIDDEN');
  const year = Number(request.query.year) || new Date().getUTCFullYear();
  const entries = await LeaveLedgerEntry.find({ employee, year }).populate('leaveType', 'name code');
  const groups = new Map<string, any>();
  for (const entry of entries) {
    const key = entry.leaveType._id.toString(); const group = groups.get(key) ?? { leaveType: entry.leaveType, entries: [] };
    group.entries.push({ type: entry.type, amount: entry.amount }); groups.set(key, group);
  }
  ok(response, [...groups.values()].map((group) => ({ leaveType: group.leaveType, ...summarizeLedger(group.entries) })));
}));

leaveRouter.post('/balances/adjust', requirePermission('leave:configure'), asyncHandler(async (request, response) => {
  const input = z.object({ employee: z.string(), leaveType: z.string(), year: z.number().int(), amount: z.number().refine((value) => value !== 0), reason: z.string().min(5) }).parse(request.body);
  const entry = await LeaveLedgerEntry.create({ ...input, type: 'ADJUSTMENT', actor: request.auth!.sub });
  await audit(request, 'LEAVE_BALANCE_ADJUSTED', 'LeaveLedgerEntry', entry._id, input); ok(response, entry, undefined, 201);
}));

leaveRouter.get('/requests', asyncHandler(async (request, response) => {
  const filter: any = {};
  if (request.auth!.role === 'EMPLOYEE') filter.employee = request.auth!.employeeId;
  if (request.auth!.role === 'MANAGER') {
    const reports = await Employee.find({ 'employment.reportingManager': request.auth!.employeeId }).distinct('_id');
    filter.employee = { $in: [request.auth!.employeeId, ...reports] };
  }
  if (request.query.status) filter.status = request.query.status;
  ok(response, await LeaveRequest.find(filter).populate('employee', 'employeeId fullName').populate('leaveType', 'name code paid').sort({ createdAt: -1 }));
}));

leaveRouter.post('/requests', asyncHandler(async (request, response) => {
  if (!request.auth!.employeeId) throw new ApiError(403, 'No employee profile linked', 'PROFILE_NOT_LINKED');
  const input = z.object({ leaveType: z.string(), startDate: z.coerce.date(), endDate: z.coerce.date(), partialDay: z.enum(['NONE', 'FIRST_HALF', 'SECOND_HALF']).default('NONE'), reason: z.string().min(5).max(1000), submit: z.boolean().default(true) }).parse(request.body);
  const type = await LeaveType.findOne({ _id: input.leaveType, active: true });
  if (!type) throw new ApiError(422, 'Leave type is inactive or unavailable', 'INVALID_LEAVE_TYPE');
  let requestedDays: number; try { requestedDays = calculateRequestedDays(input.startDate, input.endDate, input.partialDay); } catch (error) { throw new ApiError(422, (error as Error).message, 'INVALID_DATES'); }
  if (input.partialDay !== 'NONE' && !type.allowHalfDay) throw new ApiError(422, 'This leave type does not allow a half day', 'HALF_DAY_NOT_ALLOWED');
  if (type.requiresAttachment && !request.body.attachment) throw new ApiError(422, 'An attachment is required', 'ATTACHMENT_REQUIRED');
  const overlap = await LeaveRequest.exists({ employee: request.auth!.employeeId, status: { $in: ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED'] }, startDate: { $lte: input.endDate }, endDate: { $gte: input.startDate } });
  if (overlap) throw new ApiError(409, 'This leave overlaps an existing request', 'LEAVE_OVERLAP');
  const summary = summarizeLedger((await LeaveLedgerEntry.find({ employee: request.auth!.employeeId, leaveType: type._id, year: input.startDate.getUTCFullYear() })).map((entry) => ({ type: entry.type, amount: entry.amount })));
  if (summary.remaining < requestedDays) throw new ApiError(409, 'Insufficient leave balance', 'INSUFFICIENT_BALANCE');
  const employee = await Employee.findById(request.auth!.employeeId);
  const status = input.submit ? (employee?.employment?.reportingManager ? 'PENDING_MANAGER' : 'PENDING_HR') : 'DRAFT';
  const item = await LeaveRequest.create({ ...input, employee: request.auth!.employeeId, requestedDays, status, decisions: input.submit ? [{ actor: request.auth!.sub, role: request.auth!.role, action: 'SUBMIT' }] : [] });
  if (input.submit) await LeaveLedgerEntry.create({ employee: item.employee, leaveType: item.leaveType, year: input.startDate.getUTCFullYear(), type: 'RESERVATION', amount: -requestedDays, reason: 'Reserved for submitted leave request', leaveRequest: item._id, actor: request.auth!.sub });
  await audit(request, 'LEAVE_REQUEST_CREATED', 'LeaveRequest', item._id, { ...input, requestedDays, status }); ok(response, item, undefined, 201);
}));

leaveRouter.post('/requests/:id/decision', asyncHandler(async (request, response) => {
  const input = z.object({ action: z.enum(['APPROVE', 'REJECT']), comment: z.string().max(500).optional() }).parse(request.body);
  const item = await LeaveRequest.findById(request.params.id); if (!item) throw new ApiError(404, 'Leave request not found', 'NOT_FOUND');
  if (request.auth!.role === 'MANAGER' && !await Employee.exists({ _id: item.employee, 'employment.reportingManager': request.auth!.employeeId })) throw new ApiError(403, 'This employee is not in your team', 'FORBIDDEN');
  const previous = item.status;
  try { item.status = nextLeaveStatus(item.status as any, request.auth!.role, input.action) as any; } catch (error) { throw new ApiError(409, (error as Error).message, 'INVALID_WORKFLOW_TRANSITION'); }
  item.decisions.push({ actor: request.auth!.sub as any, role: request.auth!.role, action: input.action, comment: input.comment, timestamp: new Date() } as any); await item.save();
  if (item.status === 'REJECTED') await LeaveLedgerEntry.create({ employee: item.employee, leaveType: item.leaveType, year: item.startDate.getUTCFullYear(), type: 'RELEASE', amount: item.requestedDays, reason: 'Reservation released after rejection', leaveRequest: item._id, actor: request.auth!.sub });
  if (item.status === 'APPROVED') {
    await LeaveLedgerEntry.create([{ employee: item.employee, leaveType: item.leaveType, year: item.startDate.getUTCFullYear(), type: 'RELEASE', amount: item.requestedDays, reason: 'Reservation converted to usage', leaveRequest: item._id, actor: request.auth!.sub }, { employee: item.employee, leaveType: item.leaveType, year: item.startDate.getUTCFullYear(), type: 'USAGE', amount: -item.requestedDays, reason: 'Approved leave used', leaveRequest: item._id, actor: request.auth!.sub }]);
    for (let date = utcDay(item.startDate); date <= utcDay(item.endDate); date = new Date(date.getTime() + 86_400_000)) {
      const attendance = await Attendance.findOne({ employee: item.employee, date });
      if (!attendance) {
        await Attendance.create({ employee: item.employee, date, status: 'LEAVE', source: 'SYSTEM', notes: `Approved leave ${item.id}` });
      } else if (!attendance.checkIn && !attendance.checkOut) {
        attendance.status = 'LEAVE';
        attendance.source = 'SYSTEM';
        attendance.notes = `Approved leave ${item.id}`;
        await attendance.save();
      } else {
        attendance.notes = `${attendance.notes ? `${attendance.notes}; ` : ''}Approved leave conflict ${item.id}`;
        await attendance.save();
      }
    }
  }
  await audit(request, `LEAVE_${input.action}`, 'LeaveRequest', item._id, { previous, status: item.status, comment: input.comment }); ok(response, item);
}));
