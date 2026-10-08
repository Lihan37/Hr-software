import { describe, expect, it } from 'vitest';
import { employeeScope } from '../src/modules/employees/employee-access.js';

describe('employee data scope', () => {
  it('restricts employees to their own record', () => {
    expect(employeeScope({ sub: 'u1', role: 'EMPLOYEE', employeeId: 'e1', type: 'access' })).toEqual({ _id: 'e1' });
  });
  it('restricts managers to themselves and direct reports', () => {
    expect(employeeScope({ sub: 'u2', role: 'MANAGER', employeeId: 'm1', type: 'access' })).toEqual({ $or: [{ _id: 'm1' }, { 'employment.reportingManager': 'm1' }] });
  });
  it('allows HR to use an unrestricted query scope', () => {
    expect(employeeScope({ sub: 'u3', role: 'HR', employeeId: 'h1', type: 'access' })).toEqual({});
  });
});
