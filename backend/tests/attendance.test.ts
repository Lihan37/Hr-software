import { describe, expect, it } from 'vitest';
import { Attendance } from '../src/modules/attendance/attendance.model.js';
import { calculateAttendance, utcDay } from '../src/modules/attendance/attendance.policy.js';
import { nextCorrectionStatus } from '../src/modules/attendance-corrections/correction.workflow.js';

describe('attendance', () => {
  it('declares a unique employee/date index', () => {
    const index = Attendance.schema.indexes().find(([fields]) => fields.employee === 1 && fields.date === 1);
    expect(index?.[1]).toMatchObject({ unique: true });
  });
  it('calculates late, worked and overtime minutes', () => {
    const date = '2026-09-01T';
    expect(calculateAttendance({ scheduledStart: new Date(`${date}08:00:00Z`), scheduledEnd: new Date(`${date}17:00:00Z`), checkIn: new Date(`${date}08:06:00Z`), checkOut: new Date(`${date}17:11:00Z`) })).toMatchObject({ lateMinutes: 6, workedMinutes: 545, overtimeMinutes: 5, status: 'PRESENT' });
  });
  it('normalizes dates to UTC day boundaries', () => expect(utcDay('2026-09-12T21:15:00Z').toISOString()).toBe('2026-09-12T00:00:00.000Z'));
  it('enforces manager then HR correction approval', () => {
    expect(nextCorrectionStatus('PENDING_MANAGER', 'MANAGER', 'APPROVE')).toBe('PENDING_HR');
    expect(nextCorrectionStatus('PENDING_HR', 'HR', 'APPROVE')).toBe('APPROVED');
    expect(() => nextCorrectionStatus('PENDING_MANAGER', 'EMPLOYEE', 'APPROVE')).toThrow();
  });
});
