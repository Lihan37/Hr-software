import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/api-response.js';
import { Attendance } from '../attendance/attendance.model.js';
import { utcDay } from '../attendance/attendance.policy.js';
import { AttendanceCorrection } from '../attendance-corrections/attendance-correction.model.js';
import { Employee } from '../employees/employee.model.js';
import { LeaveRequest } from '../leave/leave.model.js';
import { Notification } from '../employee-lifecycle/lifecycle.model.js';

export const dashboardRouter = Router(); dashboardRouter.use(authenticate);
dashboardRouter.get('/', asyncHandler(async (request, response) => {
  const today = utcDay(new Date()); const tomorrow = new Date(today.getTime() + 86_400_000);
  let employeeFilter: any = {};
  if (request.auth!.role === 'EMPLOYEE') employeeFilter = { _id: request.auth!.employeeId };
  if (request.auth!.role === 'MANAGER') employeeFilter = { $or: [{ _id: request.auth!.employeeId }, { 'employment.reportingManager': request.auth!.employeeId }] };
  const employees = await Employee.find(employeeFilter).select('_id'); const employeeIds = employees.map((item) => item._id);
  const attendanceFilter = { employee: { $in: employeeIds }, date: { $gte: today, $lt: tomorrow } };
  const [total, active, present, absent, leave, late, pendingLeave, pendingCorrections, todayAttendance, lifecycleNotifications] = await Promise.all([
    Employee.countDocuments(employeeFilter), Employee.countDocuments({ ...employeeFilter, 'employment.status': 'ACTIVE' }),
    Attendance.countDocuments({ ...attendanceFilter, status: 'PRESENT' }), Attendance.countDocuments({ ...attendanceFilter, status: 'ABSENT' }),
    Attendance.countDocuments({ ...attendanceFilter, status: 'LEAVE' }), Attendance.countDocuments({ ...attendanceFilter, lateMinutes: { $gt: 0 } }),
    LeaveRequest.countDocuments({ employee: { $in: employeeIds }, status: { $in: ['PENDING_MANAGER', 'PENDING_HR'] } }),
    AttendanceCorrection.countDocuments({ employee: { $in: employeeIds }, status: { $in: ['PENDING_MANAGER', 'PENDING_HR'] } }),
    request.auth!.employeeId ? Attendance.findOne({ employee: request.auth!.employeeId, date: today }) : null,
    ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(request.auth!.role) ? Notification.countDocuments({ recipientRole: 'HR', status: { $in: ['DUE_SOON', 'DUE_TODAY', 'OVERDUE'] }, type: 'PROBATION_EVALUATION_DUE' }) : 0
  ]);
  ok(response, { totalEmployees: total, activeEmployees: active, presentToday: present, absentToday: absent, onLeaveToday: leave, lateToday: late, pendingLeave, pendingCorrections, probationEvaluationsDue: lifecycleNotifications, todayAttendance });
}));
