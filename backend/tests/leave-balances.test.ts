import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { issueAccessToken } from '../src/modules/auth/auth.service.js';
import type { AuthClaims, Role } from '../src/types/auth.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { LeaveLedgerEntry, LeaveType } from '../src/modules/leave/leave.model.js';
import { balanceFilters, leaveBalanceScope } from '../src/modules/leave/leave-balances.service.js';

const employeeId = '507f191e810c19729de860ea';
const otherId = '507f191e810c19729de860eb';
const typeId = '507f191e810c19729de860ec';
const claims = (role: Role, linked = true): AuthClaims => ({ sub: '507f1f77bcf86cd799439011', role, type: 'access', ...(linked ? { employeeId } : {}) });
const token = (role: Role, linked = true) => issueAccessToken(claims(role).sub, role, linked ? employeeId : undefined);
function query(value: unknown): any {
  return { select: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(value) };
}
function mockList(total = 1) {
  const count = vi.spyOn(Employee, 'countDocuments').mockResolvedValue(total);
  const employees = query([{ _id: employeeId, employeeId: 'EMP-000001', fullName: 'Employee One', employment: { department: { name: 'HR' }, status: 'ACTIVE', employmentType: 'PERMANENT', confirmationDate: '2020-01-01' } }]);
  const find = vi.spyOn(Employee, 'find').mockReturnValue(employees);
  vi.spyOn(LeaveType, 'find').mockReturnValue(query([{ _id: typeId, code: 'CL', name: 'Casual leave' }]));
  const ledger = vi.spyOn(LeaveLedgerEntry, 'find').mockReturnValue(query([
    { employee: employeeId, leaveType: typeId, type: 'ANNUAL_ENTITLEMENT', amount: 10 },
    { employee: employeeId, leaveType: typeId, type: 'LEAVE_DEDUCTION', amount: -2 },
    { employee: employeeId, leaveType: typeId, type: 'LEAVE_RESERVATION', amount: -1 },
  ]));
  return { count, employees, find, ledger };
}
afterEach(() => vi.restoreAllMocks());

describe('leave balance visibility', () => {
  it('gives only HR roles organization-wide scope, even without a linked profile', () => {
    for (const role of ['SUPER_ADMIN', 'HR_ADMIN', 'HR'] as const) expect(leaveBalanceScope(claims(role, false))).toEqual({});
  });
  it('restricts HODs to self and assigned reviewer/reporting-manager employees', () => {
    expect(leaveBalanceScope(claims('MANAGER'))).toEqual({ $or: [{ _id: employeeId }, { 'employment.reviewer': employeeId }, { 'employment.reportingManager': employeeId }] });
    expect(leaveBalanceScope(claims('EMPLOYEE'))).toEqual({ _id: employeeId });
    expect(() => leaveBalanceScope(claims('MANAGER', false))).toThrow('No employee profile');
    expect(() => leaveBalanceScope(claims('EMPLOYEE', false))).toThrow('No employee profile');
  });
  it('validates page, year, IDs and search inputs', () => {
    for (const input of [{ year: 0 }, { year: 'bad' }, { page: -1 }, { employee: 'bad' }, { search: { $ne: '' } }, { search: 'a'.repeat(101) }]) expect(() => balanceFilters.parse(input)).toThrow();
  });
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/leave/balances/overview')).status).toBe(401);
  });
  it('serves ledger summaries for HR without creating grants or accruals', async () => {
    const { ledger } = mockList();
    const create = vi.spyOn(LeaveLedgerEntry, 'create');
    const response = await request(app).get('/api/v1/leave/balances/overview?year=2026').set('Authorization', `Bearer ${token('HR', false)}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ scope: 'ALL', total: 1, year: 2026, page: 1 });
    expect(response.body.data.rows[0].balances[0]).toMatchObject({ entitled: 10, used: 2, pending: 1, available: 7 });
    expect(response.body.data.rows[0].eligible).toBe(true);
    expect(ledger).toHaveBeenCalledWith({ employee: { $in: [employeeId] }, year: 2026 });
    expect(create).not.toHaveBeenCalled();
  });
  it('ANDs HOD scope with requested employee and escaped search, never widening access', async () => {
    const { count, find } = mockList();
    const response = await request(app).get(`/api/v1/leave/balances/overview?employee=${otherId}&search=.%2A&year=2026`).set('Authorization', `Bearer ${token('MANAGER')}`);
    expect(response.status).toBe(200);
    const expected = { $and: [leaveBalanceScope(claims('MANAGER')), { _id: otherId }, { $or: [{ employeeId: { $regex: '\\.\\*', $options: 'i' } }, { fullName: { $regex: '\\.\\*', $options: 'i' } }] }] };
    expect(count).toHaveBeenCalledWith(expected); expect(find).toHaveBeenCalledWith(expected);
    expect(response.body.data.scope).toBe('TEAM');
  });
  it('ignores client scope overrides for ordinary employees', async () => {
    const { count } = mockList();
    const response = await request(app).get('/api/v1/leave/balances/overview?scope=ALL&role=HR').set('Authorization', `Bearer ${token('EMPLOYEE')}`);
    expect(response.status).toBe(200);
    expect(count).toHaveBeenCalledWith({ $and: [{ _id: employeeId }] });
    expect(response.body.data.scope).toBe('SELF');
  });
  it('paginates employees and clamps pages after search changes', async () => {
    const { employees } = mockList(26);
    const response = await request(app).get('/api/v1/leave/balances/overview?page=100').set('Authorization', `Bearer ${token('HR')}`);
    expect(response.status).toBe(200); expect(response.body.data.page).toBe(2);
    expect(employees.skip).toHaveBeenCalledWith(25); expect(employees.limit).toHaveBeenCalledWith(25);
  });
  it('rejects unlinked HODs without reading employees', async () => {
    const find = vi.spyOn(Employee, 'find');
    const response = await request(app).get('/api/v1/leave/balances/overview').set('Authorization', `Bearer ${token('MANAGER', false)}`);
    expect(response.status).toBe(403); expect(find).not.toHaveBeenCalled();
  });
  it('returns an empty page without reading any ledger when no scoped employees match', async () => {
    vi.spyOn(Employee, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Employee, 'find').mockReturnValue(query([]));
    vi.spyOn(LeaveType, 'find').mockReturnValue(query([{ _id: typeId, code: 'CL', name: 'Casual leave' }]));
    const ledger = vi.spyOn(LeaveLedgerEntry, 'find');
    const response = await request(app).get('/api/v1/leave/balances/overview').set('Authorization', `Bearer ${token('MANAGER')}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ total: 0, page: 1, rows: [] });
    expect(ledger).not.toHaveBeenCalled();
  });
  it('rejects invalid query parameters at the API boundary', async () => {
    const find = vi.spyOn(Employee, 'find');
    const response = await request(app).get('/api/v1/leave/balances/overview?year=not-a-year').set('Authorization', `Bearer ${token('HR')}`);
    expect(response.status).toBe(422); expect(find).not.toHaveBeenCalled();
  });
  it('denies direct balance lookups outside the same scoped employee query', async () => {
    const exists = vi.spyOn(Employee, 'exists').mockResolvedValue(null);
    const ledger = vi.spyOn(LeaveLedgerEntry, 'find');
    const response = await request(app).get(`/api/v1/leave/balances?employee=${otherId}&year=2026`).set('Authorization', `Bearer ${token('EMPLOYEE')}`);
    expect(response.status).toBe(403);
    expect(exists).toHaveBeenCalledWith({ $and: [{ _id: employeeId }, { _id: otherId }] });
    expect(ledger).not.toHaveBeenCalled();
  });
});
