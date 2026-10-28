import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { issueAccessToken } from '../src/modules/auth/auth.service.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { LeaveLedgerEntry, LeaveType } from '../src/modules/leave/leave.model.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';
import type { Role } from '../src/types/auth.js';

const actor = '507f1f77bcf86cd799439011';
const input = { employee: '507f191e810c19729de860ea', leaveType: '507f191e810c19729de860ec', year: 2026, amount: 2, reason: 'Opening balance correction', operationId: 'MANUAL:test-reference-123' };
const entry = { ...input, _id: '507f191e810c19729de860ed', actor, type: 'MANUAL_ADJUSTMENT' };
const token = (role: Role) => issueAccessToken(actor, role);
const post = (body: object = input, role: Role = 'HR') => request(app).post('/api/v1/leave/balances/adjust').set('Authorization', `Bearer ${token(role)}`).send(body);
function mocks() {
  vi.spyOn(LeaveLedgerEntry, 'findOne').mockResolvedValue(null);
  vi.spyOn(Employee, 'exists').mockResolvedValue({ _id: input.employee } as never);
  vi.spyOn(LeaveType, 'exists').mockResolvedValue({ _id: input.leaveType } as never);
  const write = vi.spyOn(LeaveLedgerEntry, 'findOneAndUpdate').mockResolvedValue(entry as never);
  const audit = vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);
  return { write, audit };
}
afterEach(() => vi.restoreAllMocks());

describe('manual leave adjustments', () => {
  it('requires authentication and denies managers/employees for write and history', async () => {
    expect((await request(app).post('/api/v1/leave/balances/adjust').send(input)).status).toBe(401);
    const write = vi.spyOn(LeaveLedgerEntry, 'findOneAndUpdate');
    for (const role of ['MANAGER', 'EMPLOYEE'] as const) {
      expect((await post(input, role)).status).toBe(403);
      expect((await request(app).get(`/api/v1/leave/balances/adjustments?employee=${input.employee}`).set('Authorization', `Bearer ${token(role)}`)).status).toBe(403);
    }
    expect(write).not.toHaveBeenCalled();
  });
  it.each(['HR', 'HR_ADMIN', 'SUPER_ADMIN'] as const)('allows %s to append a reasoned and attributed adjustment', async (role) => {
    const { write, audit } = mocks();
    expect((await post(input, role)).status).toBe(201);
    expect(write).toHaveBeenCalledWith({ operationId: input.operationId }, { $setOnInsert: { ...input, type: 'MANUAL_ADJUSTMENT', actor } }, { upsert: true, new: true, runValidators: true });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAVE_BALANCE_ADJUSTED', actor, changes: expect.objectContaining({ reason: input.reason, amount: 2 }) }));
  });
  it('supports precise deductions without rewriting any prior transactions', async () => {
    const { write } = mocks();
    write.mockResolvedValue({ ...entry, amount: -1.25 } as never);
    expect((await post({ ...input, amount: -1.25 })).status).toBe(201);
    expect(write.mock.calls[0]?.[1]).toEqual({ $setOnInsert: expect.objectContaining({ amount: -1.25 }) });
  });
  it('validates IDs, year, non-zero finite precision, reason and retry reference before reading DB', async () => {
    const find = vi.spyOn(LeaveLedgerEntry, 'findOne');
    for (const change of [{ employee: 'bad' }, { leaveType: 'bad' }, { year: 0 }, { amount: 0 }, { amount: 0.001 }, { amount: 10001 }, { reason: '     ' }, { operationId: '' }]) expect((await post({ ...input, ...change })).status).toBe(422);
    expect(find).not.toHaveBeenCalled();
  });
  it('refuses missing employees and inactive leave types', async () => {
    const { write } = mocks();
    vi.mocked(Employee.exists).mockResolvedValueOnce(null);
    expect((await post()).status).toBe(404);
    vi.mocked(LeaveType.exists).mockResolvedValueOnce(null);
    expect((await post()).status).toBe(422);
    expect(write).not.toHaveBeenCalled();
  });
  it('returns the same saved entry on retry without another write', async () => {
    const { write, audit } = mocks();
    vi.mocked(LeaveLedgerEntry.findOne).mockResolvedValue(entry as never);
    expect((await post()).status).toBe(200);
    expect(write).not.toHaveBeenCalled(); expect(audit).not.toHaveBeenCalled();
  });
  it('rejects reference reuse across different payloads, actors or ledger transaction types', async () => {
    const { write } = mocks();
    for (const change of [{ amount: 8 }, { actor: 'other-user' }, { type: 'ANNUAL_ENTITLEMENT' }]) {
      vi.mocked(LeaveLedgerEntry.findOne).mockResolvedValueOnce({ ...entry, ...change } as never);
      expect((await post()).status).toBe(409);
    }
    expect(write).not.toHaveBeenCalled();
  });
  it('recovers a concurrent duplicate-key retry without duplicating the ledger', async () => {
    const { write } = mocks();
    write.mockRejectedValueOnce({ code: 11000 });
    vi.mocked(LeaveLedgerEntry.findOne).mockResolvedValueOnce(null).mockResolvedValueOnce(entry as never);
    expect((await post()).status).toBe(201); expect(write).toHaveBeenCalledTimes(1);
  });
  it('returns year-and-employee-scoped paginated adjustment history with only safe actor fields', async () => {
    const count = vi.spyOn(LeaveLedgerEntry, 'countDocuments').mockResolvedValue(21);
    const chain: any = { select: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([entry]) };
    vi.spyOn(LeaveLedgerEntry, 'find').mockReturnValue(chain);
    const result = await request(app).get(`/api/v1/leave/balances/adjustments?employee=${input.employee}&year=2026&page=2`).set('Authorization', `Bearer ${token('HR')}`);
    expect(result.status).toBe(200); expect(result.body.data).toMatchObject({ total: 21, page: 2, pageSize: 20 });
    expect(count).toHaveBeenCalledWith({ employee: input.employee, year: 2026, type: 'MANUAL_ADJUSTMENT' });
    expect(chain.skip).toHaveBeenCalledWith(20); expect(chain.populate).toHaveBeenCalledWith('actor', 'email');
  });
});
