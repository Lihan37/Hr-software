export function calculateRequestedDays(start: Date, end: Date, partialDay: 'NONE' | 'FIRST_HALF' | 'SECOND_HALF' = 'NONE'): number {
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (endDay < startDay) throw new Error('End date cannot be before start date');
  const calendarDays = Math.floor((endDay - startDay) / 86_400_000) + 1;
  if (partialDay !== 'NONE' && calendarDays !== 1) throw new Error('Partial-day leave must start and end on the same date');
  return partialDay === 'NONE' ? calendarDays : 0.5;
}

export function overlaps(existingStart: Date, existingEnd: Date, start: Date, end: Date): boolean {
  return existingStart <= end && existingEnd >= start;
}

export type LeaveStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export function nextLeaveStatus(current: LeaveStatus, role: string, action: 'APPROVE' | 'REJECT'): LeaveStatus {
  if (action === 'REJECT' && ((current === 'PENDING_MANAGER' && role === 'MANAGER') || (current === 'PENDING_HR' && ['HR', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role)))) return 'REJECTED';
  if (action === 'APPROVE' && current === 'PENDING_MANAGER' && role === 'MANAGER') return 'PENDING_HR';
  if (action === 'APPROVE' && current === 'PENDING_HR' && ['HR', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role)) return 'APPROVED';
  throw new Error('This decision is not allowed at the current workflow stage');
}

export function summarizeLedger(entries: Array<{ type: string; amount: number }>) {
  const entitled = entries.filter((entry) => ['OPENING', 'ENTITLEMENT'].includes(entry.type)).reduce((sum, entry) => sum + entry.amount, 0);
  const adjustments = entries.filter((entry) => entry.type === 'ADJUSTMENT').reduce((sum, entry) => sum + entry.amount, 0);
  const used = -entries.filter((entry) => entry.type === 'USAGE').reduce((sum, entry) => sum + entry.amount, 0);
  const pending = -entries.filter((entry) => entry.type === 'RESERVATION').reduce((sum, entry) => sum + entry.amount, 0)
    - entries.filter((entry) => entry.type === 'RELEASE').reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return { entitled, adjustments, used, pending, remaining };
}
