import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Notification, Sequence } from '../src/modules/employee-lifecycle/lifecycle.model.js';
import { addUtcMonths, nextTraineeId, reminderStatus } from '../src/modules/employee-lifecycle/lifecycle.service.js';
import { hasPermission } from '../src/modules/auth/permissions.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { Location } from '../src/modules/organization/organization.model.js';

describe('employee lifecycle policies', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('calculates a four-calendar-month probation end without date overflow', () => {
    expect(addUtcMonths(new Date('2026-01-10T00:00:00Z'), 4).toISOString()).toBe('2026-05-10T00:00:00.000Z');
    expect(addUtcMonths(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('distinguishes due soon, due today, and overdue in UTC', () => {
    const now = new Date('2026-05-03T12:00:00Z');
    expect(reminderStatus(new Date('2026-05-10T00:00:00Z'), now)).toEqual({ days: 7, status: 'DUE_SOON' });
    expect(reminderStatus(new Date('2026-05-03T23:00:00Z'), now).status).toBe('DUE_TODAY');
    expect(reminderStatus(new Date('2026-05-01T00:00:00Z'), now)).toEqual({ days: -2, status: 'OVERDUE' });
  });

  it('uses one atomic counter increment per concurrent trainee ID', async () => {
    let value = 0;
    vi.spyOn(Sequence, 'findOneAndUpdate').mockImplementation(() => Promise.resolve({ value: ++value }) as unknown as ReturnType<typeof Sequence.findOneAndUpdate>);
    await expect(Promise.all([nextTraineeId(2026), nextTraineeId(2026), nextTraineeId(2026)])).resolves.toEqual(['202601', '202602', '202603']);
    expect(Sequence.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });

  it('resets by year through a separate sequence key', async () => {
    vi.spyOn(Sequence, 'findOneAndUpdate').mockImplementation(() => Promise.resolve({ value: 1 }) as unknown as ReturnType<typeof Sequence.findOneAndUpdate>);
    await expect(nextTraineeId(2027)).resolves.toBe('202701');
    expect(Sequence.findOneAndUpdate).toHaveBeenCalledWith({ key: 'TRAINEE_ID_2027' }, { $inc: { value: 1 } }, expect.objectContaining({ upsert: true, new: true }));
  });

  it('enforces logical notification uniqueness per role, type, employee, and cycle', () => {
    const index = Notification.schema.indexes().find(([fields]) => fields.recipientRole === 1 && fields.type === 1 && fields.entityId === 1 && fields.cycleKey === 1);
    expect(index?.[1]).toMatchObject({ unique: true });
  });

  it('separates manager evaluation from HR finalization permissions', () => {
    expect(hasPermission('MANAGER', 'probation:evaluate:manager')).toBe(true);
    expect(hasPermission('MANAGER', 'probation:finalize')).toBe(false);
    expect(hasPermission('HR', 'probation:finalize')).toBe(true);
  });

  it('stores employee-specific lifecycle overrides and a controlled location reference', () => {
    expect(Employee.schema.path('employment.probationDurationMonths')).toBeDefined();
    expect(Employee.schema.path('employment.probationReminderDays')).toBeDefined();
    expect(Employee.schema.path('employment.contractReminderDays')).toBeDefined();
    expect(Employee.schema.path('employment.traineeReminderDays')).toBeDefined();
    expect(Employee.schema.path('employment.locationRef')?.options.ref).toBe('Location');
    expect(Location.schema.path('timezone')).toBeDefined();
  });
});
