import { describe, expect, it } from 'vitest';
import { calculateRequestedDays, nextLeaveStatus, overlaps, summarizeLedger } from '../src/modules/leave/leave.policy.js';

describe('leave rules', () => {
  it('calculates calendar days while policy calendars remain configurable', () => {
    expect(calculateRequestedDays(new Date('2026-09-10'), new Date('2026-09-12'))).toBe(3);
    expect(calculateRequestedDays(new Date('2026-09-10'), new Date('2026-09-10'), 'FIRST_HALF')).toBe(0.5);
    expect(() => calculateRequestedDays(new Date('2026-09-12'), new Date('2026-09-10'))).toThrow();
  });
  it('detects inclusive overlap', () => {
    expect(overlaps(new Date('2026-09-10'), new Date('2026-09-12'), new Date('2026-09-12'), new Date('2026-09-14'))).toBe(true);
    expect(overlaps(new Date('2026-09-10'), new Date('2026-09-11'), new Date('2026-09-12'), new Date('2026-09-14'))).toBe(false);
  });
  it('derives balances from ledger history', () => {
    expect(summarizeLedger([{ type: 'ENTITLEMENT', amount: 12 }, { type: 'RESERVATION', amount: -1 }, { type: 'USAGE', amount: -5 }])).toEqual({ entitled: 12, adjustments: 0, used: 5, pending: 1, remaining: 6 });
  });
  it('enforces manager then HR leave approval', () => {
    expect(nextLeaveStatus('PENDING_MANAGER', 'MANAGER', 'APPROVE')).toBe('PENDING_HR');
    expect(nextLeaveStatus('PENDING_HR', 'HR_ADMIN', 'APPROVE')).toBe('APPROVED');
    expect(() => nextLeaveStatus('PENDING_HR', 'MANAGER', 'APPROVE')).toThrow();
  });
});
