import { Attendance } from '../attendance/attendance.model.js';
import { utcDay } from '../attendance/attendance.policy.js';
import { User } from '../users/user.model.js';
import { CompensatoryHolidayCredit, LeaveLedgerEntry, LeaveNotification, LeavePolicy, LeaveRequest, LeaveType, WeeklyHolidaySchedule } from './leave.model.js';
import { chOperationId, summarizeLedger } from './leave.policy.js';

export async function notifyLeave(input: { type: string; requestId: any; employee?: any; recipientRole?: string; message: string; suffix: string }) {
  await LeaveNotification.updateOne({ operationId: `${input.requestId}:${input.suffix}` }, { $setOnInsert: { recipientRole: input.recipientRole, employee: input.employee, type: input.type, entityId: input.requestId, operationId: `${input.requestId}:${input.suffix}`, title: input.type.replaceAll('_', ' '), message: input.message } }, { upsert: true });
}

export async function reconcileApprovedLeave(request: any) {
  for (let date = utcDay(request.startDate); date <= utcDay(request.endDate); date = new Date(date.getTime() + 86_400_000)) {
    const current: any = await Attendance.findOne({ employee: request.employee, date });
    if (!current) await Attendance.create({ employee: request.employee, date, status: 'APPROVED_LEAVE', source: 'SYSTEM', leaveRequest: request._id, notes: `Approved leave ${request.id}` });
    else if (!current.checkIn && !current.checkOut) { current.status = 'APPROVED_LEAVE'; current.source = 'SYSTEM'; current.leaveRequest = request._id; current.notes = `Approved leave ${request.id}`; await current.save(); }
    else { current.leaveRequest = request._id; current.notes = `${current.notes ? `${current.notes}; ` : ''}Approved leave conflict ${request.id}`; await current.save(); }
  }
}

export async function reverseLeaveAttendance(request: any) {
  await Attendance.updateMany({ leaveRequest: request._id, status: 'APPROVED_LEAVE', checkIn: null, checkOut: null }, { $set: { status: 'ABSENT', notes: `Leave ${request.id} cancelled` }, $unset: { leaveRequest: 1 } });
}

export async function processCompensatoryHoliday(attendanceId: string, actorId: string) {
  const attendance: any = await Attendance.findById(attendanceId);
  if (!attendance) return null;
  const schedule: any = await WeeklyHolidaySchedule.findOne({ employee: attendance.employee, date: attendance.date, active: true });
  if (!schedule) return null;
  const operationId = chOperationId(String(attendance.employee), utcDay(attendance.date));
  const policy: any = await LeavePolicy.findOne({ key: 'DEFAULT' });
  const qualifies = !!policy?.chQualification?.enabled && policy.chQualification.minimumWorkedMinutes !== null && attendance.workedMinutes >= policy.chQualification.minimumWorkedMinutes && (!policy.chQualification.requiresPriorAuthorization || schedule.authorizedDuty);
  const credit: any = await CompensatoryHolidayCredit.findOneAndUpdate({ operationId }, { $setOnInsert: { employee: attendance.employee, holidayDate: attendance.date, schedule: schedule._id, attendance: attendance._id, operationId, status: qualifies ? 'CREDITED' : 'PENDING_POLICY', qualificationSnapshot: { workedMinutes: attendance.workedMinutes, minimumWorkedMinutes: policy?.chQualification?.minimumWorkedMinutes, authorizedDuty: schedule.authorizedDuty } } }, { upsert: true, new: true });
  if (qualifies && !credit.ledgerCredit) {
    const type: any = await LeaveType.findOne({ code: 'CH', active: true });
    if (type) {
      const ledger: any = await LeaveLedgerEntry.findOneAndUpdate({ operationId: `${operationId}:CREDIT` }, { $setOnInsert: { employee: attendance.employee, leaveType: type._id, year: attendance.date.getUTCFullYear(), type: 'CH_CREDIT', amount: 1, reason: 'Verified work on scheduled weekly holiday', operationId: `${operationId}:CREDIT`, sourceType: 'Attendance', sourceId: attendance._id, actor: actorId } }, { upsert: true, new: true });
      credit.ledgerCredit = ledger._id; credit.status = 'CREDITED'; await credit.save();
    }
  }
  return credit;
}

export async function reevaluateCompensatoryHoliday(attendanceId: string, actorId: string) {
  const attendance: any = await Attendance.findById(attendanceId); if (!attendance) return null;
  const operationId = chOperationId(String(attendance.employee), utcDay(attendance.date)); const credit: any = await CompensatoryHolidayCredit.findOne({ operationId });
  if (!credit || credit.status !== 'CREDITED') return processCompensatoryHoliday(attendanceId, actorId);
  const [schedule, policy]: any[] = await Promise.all([WeeklyHolidaySchedule.findById(credit.schedule), LeavePolicy.findOne({ key: 'DEFAULT' })]);
  const stillQualifies = !!schedule?.active && !!policy?.chQualification?.enabled && policy.chQualification.minimumWorkedMinutes !== null && attendance.workedMinutes >= policy.chQualification.minimumWorkedMinutes && (!policy.chQualification.requiresPriorAuthorization || schedule.authorizedDuty);
  if (stillQualifies) return credit;
  const type: any = await LeaveType.findOne({ code: 'CH' }); if (!type) return credit;
  const consumedAfterCredit = await LeaveLedgerEntry.exists({ employee: attendance.employee, leaveType: type._id, type: { $in: ['LEAVE_DEDUCTION', 'USAGE'] }, effectiveAt: { $gte: credit.createdAt } });
  if (consumedAfterCredit) { credit.status = 'HR_RESOLUTION_REQUIRED'; credit.reason = 'CH may have been consumed before attendance correction'; await credit.save(); return credit; }
  const ledger: any = await LeaveLedgerEntry.findOneAndUpdate({ operationId: `${operationId}:REVERSAL` }, { $setOnInsert: { employee: attendance.employee, leaveType: type._id, year: attendance.date.getUTCFullYear(), type: 'CH_REVERSAL', amount: -1, reason: 'Attendance correction invalidated weekly-holiday duty', operationId: `${operationId}:REVERSAL`, sourceType: 'Attendance', sourceId: attendance._id, actor: actorId } }, { upsert: true, new: true });
  credit.ledgerReversal = ledger._id; credit.status = 'REVERSED'; credit.reason = 'Attendance no longer meets the configured CH rule'; await credit.save(); return credit;
}

export async function balanceFor(employee: string, leaveType: string, year: number) {
  const entries = await LeaveLedgerEntry.find({ employee, leaveType, year }).select('type amount');
  return summarizeLedger(entries);
}

export async function employeeUserId(employee: any) { return (await User.findOne({ employee }).select('_id'))?._id; }

export async function requestHasDeduction(requestId: any) { return !!await LeaveLedgerEntry.exists({ leaveRequest: requestId, type: { $in: ['LEAVE_DEDUCTION', 'USAGE'] } }); }

export async function pendingRequest(requestId: string) { return LeaveRequest.findById(requestId); }
