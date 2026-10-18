export const OFFICIAL_ENTITLEMENTS = { CL: 10, SL: 14, AL: 20, CH: 0 } as const;
const DAY_MS = 86_400_000;
const toMinor = (value: number) => Math.round(value * 100);
const fromMinor = (value: number) => value / 100;

export function calculateRequestedDays(start: Date, end: Date, partialDay: 'NONE' = 'NONE'): number {
  if (partialDay !== 'NONE') throw new Error('Half-day leave is not supported');
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (endDay < startDay) throw new Error('End date cannot be before start date');
  return Math.floor((endDay - startDay) / DAY_MS) + 1;
}

export function splitDaysByLeaveYear(start: Date, end: Date) {
  const result = new Map<number, number>();
  for (let cursor = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()), last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()); cursor <= last; cursor += DAY_MS) {
    const year = new Date(cursor).getUTCFullYear(); result.set(year, (result.get(year) ?? 0) + 1);
  }
  return [...result].map(([year, days]) => ({ year, days }));
}

export function overlaps(existingStart: Date, existingEnd: Date, start: Date, end: Date): boolean { return existingStart <= end && existingEnd >= start; }

export type LeaveStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_MANAGER' | 'PENDING_HOD' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'CANCELLED';
export function nextLeaveStatus(current: LeaveStatus, stage: 'HOD' | 'HR', action: 'APPROVE' | 'REJECT' | 'RETURN'): LeaveStatus {
  if (stage === 'HOD' && !['PENDING_HOD', 'PENDING_MANAGER'].includes(current)) throw new Error('HOD decision is not allowed at the current workflow stage');
  if (stage === 'HR' && current !== 'PENDING_HR') throw new Error('HR decision is not allowed at the current workflow stage');
  if (action === 'REJECT') return 'REJECTED';
  if (action === 'RETURN') return 'RETURNED';
  return stage === 'HOD' ? 'PENDING_HR' : 'APPROVED';
}

export function summarizeLedger(entries: Array<{ type: string; amount: number }>) {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.type, (totals.get(entry.type) ?? 0) + toMinor(entry.amount));
  const sum = (...types: string[]) => types.reduce((total, type) => total + (totals.get(type) ?? 0), 0);
  const entitled = sum('OPENING', 'OPENING_BALANCE', 'ENTITLEMENT', 'ANNUAL_ENTITLEMENT');
  const accrued = sum('ACCRUAL_CREDIT', 'CH_CREDIT');
  const adjustments = sum('ADJUSTMENT', 'MANUAL_ADJUSTMENT');
  const used = -sum('USAGE', 'LEAVE_DEDUCTION', 'LEAVE_REVERSAL', 'CH_REVERSAL');
  const pendingRaw = -sum('RESERVATION', 'LEAVE_RESERVATION', 'RELEASE', 'RESERVATION_RELEASE');
  const pending = pendingRaw === 0 ? 0 : pendingRaw;
  const available = [...totals.values()].reduce((total, amount) => total + amount, 0);
  return { entitled: fromMinor(entitled), accrued: fromMinor(accrued), earned: fromMinor(accrued), adjustments: fromMinor(adjustments), used: fromMinor(used), pending: fromMinor(pending), available: fromMinor(available), remaining: fromMinor(available) };
}

export function isConfirmedPermanent(employee: { employment?: { employmentType?: string; confirmationDate?: Date | string | null; status?: string } }, onDate: Date) {
  const employment = employee.employment;
  return employment?.status === 'ACTIVE' && employment.employmentType === 'PERMANENT' && !!employment.confirmationDate && new Date(employment.confirmationDate) <= onDate;
}

export function chOperationId(employeeId: string, holidayDate: Date) { return `CH:${employeeId}:${holidayDate.toISOString().slice(0, 10)}`; }
