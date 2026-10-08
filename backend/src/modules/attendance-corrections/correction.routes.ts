import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { ok } from '../../utils/api-response.js';
import { audit } from '../audit/audit.service.js';
import { Attendance } from '../attendance/attendance.model.js';
import { calculateAttendance } from '../attendance/attendance.policy.js';
import { Employee } from '../employees/employee.model.js';
import { AttendanceCorrection } from './attendance-correction.model.js';
import { nextCorrectionStatus } from './correction.workflow.js';

export const correctionRouter = Router(); correctionRouter.use(authenticate);

correctionRouter.get('/', asyncHandler(async (request, response) => {
  const filter: any = {};
  if (request.auth!.role === 'EMPLOYEE') filter.employee = request.auth!.employeeId;
  if (request.auth!.role === 'MANAGER') {
    const reports = await Employee.find({ 'employment.reportingManager': request.auth!.employeeId }).distinct('_id');
    filter.employee = { $in: [request.auth!.employeeId, ...reports] };
  }
  ok(response, await AttendanceCorrection.find(filter).populate('employee', 'employeeId fullName').populate('attendance').sort({ createdAt: -1 }));
}));

correctionRouter.post('/', asyncHandler(async (request, response) => {
  const input = z.object({ attendance: z.string(), requestedCheckIn: z.coerce.date().optional(), requestedCheckOut: z.coerce.date().optional(), reason: z.string().min(5).max(500) }).parse(request.body);
  const attendance = await Attendance.findById(input.attendance);
  if (!attendance || attendance.employee.toString() !== request.auth!.employeeId) throw new ApiError(403, 'Only your own attendance can be corrected', 'FORBIDDEN');
  const hasManager = await Employee.exists({ _id: attendance.employee, 'employment.reportingManager': { $ne: null } });
  const correction = await AttendanceCorrection.create({ attendance: attendance._id, employee: attendance.employee, originalValues: { checkIn: attendance.checkIn, checkOut: attendance.checkOut }, requestedValues: { checkIn: input.requestedCheckIn, checkOut: input.requestedCheckOut }, reason: input.reason, status: hasManager ? 'PENDING_MANAGER' : 'PENDING_HR', decisions: [{ actor: request.auth!.sub, role: request.auth!.role, action: 'SUBMIT' }] });
  await audit(request, 'ATTENDANCE_CORRECTION_SUBMITTED', 'AttendanceCorrection', correction._id, input);
  ok(response, correction, undefined, 201);
}));

correctionRouter.post('/:id/decision', asyncHandler(async (request, response) => {
  const input = z.object({ action: z.enum(['APPROVE', 'REJECT']), comment: z.string().max(500).optional() }).parse(request.body);
  const correction = await AttendanceCorrection.findById(request.params.id);
  if (!correction) throw new ApiError(404, 'Correction request not found', 'NOT_FOUND');
  if (request.auth!.role === 'MANAGER') {
    const report = await Employee.exists({ _id: correction.employee, 'employment.reportingManager': request.auth!.employeeId });
    if (!report) throw new ApiError(403, 'This employee is not in your team', 'FORBIDDEN');
  }
  try { correction.status = nextCorrectionStatus(correction.status as any, request.auth!.role, input.action) as any; }
  catch (error) { throw new ApiError(409, (error as Error).message, 'INVALID_WORKFLOW_TRANSITION'); }
  correction.decisions.push({ actor: request.auth!.sub as any, role: request.auth!.role, action: input.action, comment: input.comment, timestamp: new Date() } as any);
  await correction.save();
  if (correction.status === 'APPROVED') {
    const attendance = await Attendance.findById(correction.attendance);
    if (attendance) {
      if (!attendance.original?.checkIn && !attendance.original?.checkOut) attendance.original = { checkIn: attendance.checkIn, checkOut: attendance.checkOut, source: attendance.source } as any;
      attendance.checkIn = correction.requestedValues?.checkIn; attendance.checkOut = correction.requestedValues?.checkOut;
      Object.assign(attendance, calculateAttendance({ checkIn: attendance.checkIn ?? undefined, checkOut: attendance.checkOut ?? undefined, scheduledStart: attendance.scheduledStart ?? undefined, scheduledEnd: attendance.scheduledEnd ?? undefined }), { lastModifiedBy: request.auth!.sub, modificationReason: correction.reason });
      await attendance.save();
    }
  }
  await audit(request, `ATTENDANCE_CORRECTION_${input.action}`, 'AttendanceCorrection', correction._id, { status: correction.status, comment: input.comment });
  ok(response, correction);
}));
