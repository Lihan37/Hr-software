import { Employee } from '../employees/employee.model.js';
import { EmployeeLifecycleEvent, HrPolicy, Notification, Sequence } from './lifecycle.model.js';

export const DEMO_HR_POLICY = { probationDurationMonths: 4, probationEvaluationReminderDays: 7, contractExpiryReminderDays: 30, traineeCompletionReminderDays: 7, timezone: 'Asia/Dhaka' } as const;

export async function getHrPolicy() { return await HrPolicy.findOne({ key: 'DEFAULT' }) ?? DEMO_HR_POLICY; }
export async function nextTraineeId(year: number) { const sequence = await Sequence.findOneAndUpdate({ key: `TRAINEE_ID_${year}` }, { $inc: { value: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true }); return `${year}${String(sequence.value).padStart(2, '0')}`; }
export function addUtcMonths(date: Date, months: number) { const result = new Date(date); const day = result.getUTCDate(); result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months); const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate(); result.setUTCDate(Math.min(day, lastDay)); return result; }
export function reminderStatus(dueDate: Date, now = new Date()) { const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); const due = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()); const days = Math.round((due - today) / 86_400_000); return { days, status: days < 0 ? 'OVERDUE' : days === 0 ? 'DUE_TODAY' : 'DUE_SOON' } as const; }

async function upsertReminder(employee: any, type: 'PROBATION_EVALUATION_DUE'|'CONTRACT_EXPIRY_APPROACHING'|'TRAINEE_COMPLETION_DUE', dueDate: Date, cycleKey: string, title: string) {
  const state = reminderStatus(dueDate);
  await Notification.updateOne({ recipientRole: 'HR', type, entityId: employee._id, cycleKey }, { $set: { title, message: `${employee.fullName} requires review.`, status: state.status, dueDate, metadata: { employeeId: employee.employeeId, traineeId: employee.employment?.traineeId, daysRemaining: state.days } }, $setOnInsert: { entityType: 'Employee' } }, { upsert: true });
}

export async function runEmployeeLifecycleReminderJobs(now = new Date()) {
  const policy: any = await getHrPolicy(); const upper = (days: number) => new Date(now.getTime() + days * 86_400_000);
  const [probation, contracts, trainees] = await Promise.all([
    Employee.find({ 'employment.employmentType': 'PROBATION', 'employment.status': 'ACTIVE', 'employment.probationEndDate': { $lte: upper(policy.probationEvaluationReminderDays) }, 'employment.probationEvaluationStatus': { $ne: 'COMPLETED' } }),
    Employee.find({ 'employment.employmentType': 'CONTRACTUAL', 'employment.status': 'ACTIVE', 'employment.contractEndDate': { $lte: upper(policy.contractExpiryReminderDays) } }),
    Employee.find({ 'employment.employmentType': 'TRAINEE', 'employment.status': 'ACTIVE', 'employment.expectedCompletionDate': { $lte: upper(policy.traineeCompletionReminderDays) }, 'employment.traineeStatus': 'ACTIVE' }),
  ]);
  for (const employee of probation as any[]) await upsertReminder(employee, 'PROBATION_EVALUATION_DUE', employee.employment.probationEndDate, String(employee.employment.probationCycle ?? 1), 'Probation Evaluation Due');
  for (const employee of contracts as any[]) await upsertReminder(employee, 'CONTRACT_EXPIRY_APPROACHING', employee.employment.contractEndDate, employee.employment.contractEndDate.toISOString(), 'Contract Expiry Approaching');
  for (const employee of trainees as any[]) await upsertReminder(employee, 'TRAINEE_COMPLETION_DUE', employee.employment.expectedCompletionDate, employee.employment.expectedCompletionDate.toISOString(), 'Trainee Completion Review Due');
  return { probation: probation.length, contracts: contracts.length, trainees: trainees.length };
}

export async function lifecycleEvent(employee: unknown, eventType: string, performedBy: unknown, values: { previousValue?: unknown; newValue?: unknown; reason?: string; metadata?: unknown } = {}) { return EmployeeLifecycleEvent.create({ employee, eventType, performedBy, effectiveDate: new Date(), ...values }); }
