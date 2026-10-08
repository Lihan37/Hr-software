import type { AuthClaims } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';
import { Employee } from './employee.model.js';

export function employeeScope(auth: AuthClaims): Record<string, unknown> {
  if (['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(auth.role)) return {};
  if (!auth.employeeId) throw new ApiError(403, 'No employee profile is linked to this account', 'PROFILE_NOT_LINKED');
  if (auth.role === 'MANAGER') return { $or: [{ _id: auth.employeeId }, { 'employment.reportingManager': auth.employeeId }] };
  return { _id: auth.employeeId };
}

export async function assertEmployeeAccess(auth: AuthClaims, targetId: string, includeTeam = true): Promise<void> {
  if (['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(auth.role)) return;
  if (auth.employeeId === targetId) return;
  if (includeTeam && auth.role === 'MANAGER' && auth.employeeId) {
    if (await Employee.exists({ _id: targetId, 'employment.reportingManager': auth.employeeId })) return;
  }
  throw new ApiError(403, 'You cannot access this employee', 'FORBIDDEN');
}
