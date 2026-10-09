import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Attendance } from '../modules/attendance/attendance.model.js';
import { utcDay } from '../modules/attendance/attendance.policy.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { Employee } from '../modules/employees/employee.model.js';
import { LeaveLedgerEntry, LeaveRequest, LeaveType } from '../modules/leave/leave.model.js';
import { Department, Designation } from '../modules/organization/organization.model.js';
import { User } from '../modules/users/user.model.js';
import { HrPolicy, TraineeType } from '../modules/employee-lifecycle/lifecycle.model.js';

if (env.NODE_ENV === 'production') throw new Error('Development seed is disabled in production');
await connectDatabase();

await TraineeType.findOneAndUpdate({ code: 'ADMIN_TRAINEE' }, { name: 'Admin Trainee', code: 'ADMIN_TRAINEE', description: 'Development seed trainee category', isActive: true }, { upsert: true, new: true });
await HrPolicy.findOneAndUpdate({ key: 'DEFAULT' }, { key: 'DEFAULT', probationDurationMonths: 4, probationEvaluationReminderDays: 7, contractExpiryReminderDays: 30, traineeCompletionReminderDays: 7, timezone: 'Asia/Dhaka' }, { upsert: true, new: true });

const departments = await Promise.all([
  Department.findOneAndUpdate({ code: 'HR' }, { name: 'Human Resources', code: 'HR', active: true }, { upsert: true, new: true }),
  Department.findOneAndUpdate({ code: 'OPS' }, { name: 'Operations', code: 'OPS', active: true }, { upsert: true, new: true }),
  Department.findOneAndUpdate({ code: 'FIN' }, { name: 'Finance', code: 'FIN', active: true }, { upsert: true, new: true })
]);
const designations = await Promise.all([
  Designation.findOneAndUpdate({ code: 'HRM' }, { name: 'HR Manager', code: 'HRM', active: true, rank: 10 }, { upsert: true, new: true }),
  Designation.findOneAndUpdate({ code: 'OPSM' }, { name: 'Operations Manager', code: 'OPSM', active: true, rank: 10 }, { upsert: true, new: true }),
  Designation.findOneAndUpdate({ code: 'ASSOC' }, { name: 'Associate', code: 'ASSOC', active: true, rank: 1 }, { upsert: true, new: true })
]);

const upsertEmployee = (employeeId: string, fullName: string, department: any, designation: any, reportingManager: any = null) => Employee.findOneAndUpdate(
  { employeeId }, { employeeId, fullName, personal: { phone: '01700000000', nationality: 'Bangladeshi' }, employment: { department: department._id, designation: designation._id, employeeType: 'PERMANENT', joiningDate: new Date('2024-01-01'), status: 'ACTIVE', reportingManager, location: 'Demo Property', workShift: 'General' } }, { upsert: true, new: true, runValidators: true }
);
const adminEmployee = await upsertEmployee('DEMO-0001', 'Demo Administrator', departments[0], designations[0]);
const hrEmployee = await upsertEmployee('DEMO-0002', 'Demo HR Officer', departments[0], designations[0], adminEmployee._id);
const managerEmployee = await upsertEmployee('DEMO-0003', 'Demo Operations Manager', departments[1], designations[1], adminEmployee._id);
const employees = await Promise.all([
  upsertEmployee('DEMO-0004', 'Demo Employee One', departments[1], designations[2], managerEmployee._id),
  upsertEmployee('DEMO-0005', 'Demo Employee Two', departments[1], designations[2], managerEmployee._id),
  upsertEmployee('DEMO-0006', 'Demo Employee Three', departments[2], designations[2], managerEmployee._id)
]);

const passwordHash = await hashPassword('DemoPass123!');
const userData = [
  ['admin@demo.hrms.local', 'SUPER_ADMIN', adminEmployee._id], ['hr@demo.hrms.local', 'HR', hrEmployee._id],
  ['manager@demo.hrms.local', 'MANAGER', managerEmployee._id], ['employee@demo.hrms.local', 'EMPLOYEE', employees[0]._id]
] as const;
const users = [];
for (const [email, role, employee] of userData) users.push(await User.findOneAndUpdate({ email }, { email, role, employee, passwordHash, status: 'ACTIVE' }, { upsert: true, new: true }));

const leaveTypes = await Promise.all([
  LeaveType.findOneAndUpdate({ code: 'CL' }, { name: 'Casual Leave', code: 'CL', paid: true, active: true, allowHalfDay: true, requiresAttachment: false, defaultEntitlement: 10 }, { upsert: true, new: true }),
  LeaveType.findOneAndUpdate({ code: 'SL' }, { name: 'Sick Leave', code: 'SL', paid: true, active: true, allowHalfDay: true, requiresAttachment: false, defaultEntitlement: 14 }, { upsert: true, new: true }),
  LeaveType.findOneAndUpdate({ code: 'LWP' }, { name: 'Leave Without Pay', code: 'LWP', paid: false, active: true, allowHalfDay: false, requiresAttachment: false, defaultEntitlement: 0 }, { upsert: true, new: true })
]);
const year = new Date().getUTCFullYear();
for (const employee of [adminEmployee, hrEmployee, managerEmployee, ...employees]) {
  for (const leaveType of leaveTypes.slice(0, 2)) {
    await LeaveLedgerEntry.updateOne({ employee: employee._id, leaveType: leaveType._id, year, type: 'ENTITLEMENT', reason: 'Development seed entitlement' }, { $setOnInsert: { amount: leaveType.defaultEntitlement, actor: users[0]!._id, effectiveAt: new Date(Date.UTC(year, 0, 1)) } }, { upsert: true });
  }
}
const today = utcDay(new Date());
for (const [index, employee] of [managerEmployee, ...employees].entries()) {
  const checkIn = new Date(today.getTime() + (8 * 60 + index * 4) * 60_000); const checkOut = new Date(today.getTime() + 17 * 60 * 60_000);
  await Attendance.findOneAndUpdate({ employee: employee._id, date: today }, { employee: employee._id, date: today, checkIn, checkOut, workedMinutes: Math.floor((checkOut.getTime() - checkIn.getTime()) / 60_000), lateMinutes: Math.max(0, index * 4), status: 'PRESENT', source: 'MANUAL', notes: 'Development seed data', lastModifiedBy: users[0]!._id, modificationReason: 'Development seed' }, { upsert: true, new: true });
}
await LeaveRequest.findOneAndUpdate({ employee: employees[1]._id, reason: 'Development seed request' }, { employee: employees[1]._id, leaveType: leaveTypes[0]._id, startDate: new Date(today.getTime() + 3 * 86_400_000), endDate: new Date(today.getTime() + 3 * 86_400_000), partialDay: 'NONE', requestedDays: 1, reason: 'Development seed request', status: 'PENDING_MANAGER', decisions: [{ actor: users[3]!._id, role: 'EMPLOYEE', action: 'SUBMIT' }] }, { upsert: true });

console.log('Development seed complete. Password for all demo users: DemoPass123!');
await disconnectDatabase();
