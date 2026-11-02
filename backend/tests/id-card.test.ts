import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { issueAccessToken } from '../src/modules/auth/auth.service.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { AuditLog } from '../src/modules/audit/audit.model.js';

const id = '507f191e810c19729de860ea';
afterEach(() => vi.restoreAllMocks());
describe('employee ID card data', () => {
  it('requires authentication and denies employee/manager roles before reading data', async () => {
    const find = vi.spyOn(Employee, 'findById');
    expect((await request(app).get(`/api/v1/employees/${id}/id-card-data`)).status).toBe(401);
    for (const role of ['MANAGER', 'EMPLOYEE'] as const) {
      const token = issueAccessToken(id, role, id);
      expect((await request(app).get(`/api/v1/employees/${id}/id-card-data`).set('Authorization', `Bearer ${token}`)).status).toBe(403);
    }
    expect(find).not.toHaveBeenCalled();
  });
  it.each(['HR', 'HR_ADMIN', 'SUPER_ADMIN'] as const)('serves current Employee Master data to %s and records access', async (role) => {
    const employee = { _id: id, employeeId: 'EMP-000001', fullName: 'Synthetic Employee', employment: { department: { name: 'Front Office' } } };
    const populate = vi.fn().mockResolvedValue(employee);
    const select = vi.fn().mockReturnValue({ populate });
    vi.spyOn(Employee, 'findById').mockReturnValue({ select } as never);
    const audit = vi.spyOn(AuditLog, 'create').mockResolvedValue({} as never);
    const response = await request(app).get(`/api/v1/employees/${id}/id-card-data`).set('Authorization', `Bearer ${issueAccessToken(id, role)}`);
    expect(response.status).toBe(200); expect(response.body.data).toEqual(employee);
    expect(select).toHaveBeenCalledWith('employeeId fullName profilePhoto personal.bloodGroup employment.joiningDate employment.department employment.designation employment.locationRef employment.location');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'EMPLOYEE_ID_CARD_DATA_VIEWED', entityId: id }));
  });
});
