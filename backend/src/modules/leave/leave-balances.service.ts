import { z } from 'zod';
import type { AuthClaims } from '../../types/auth.js';
import { ApiError } from '../../utils/api-error.js';
import { Employee } from '../employees/employee.model.js';
import { LeaveLedgerEntry, LeaveType } from './leave.model.js';
import { isConfirmedPermanent, summarizeLedger } from './leave.policy.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid employee ID');
export const balanceFilters = z.object({
  year: z.coerce.number().int().min(1900).max(2200).default(() => Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(new Date()))),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().max(100).default(''),
  employee: objectId.optional(),
});

// Scope is always server-derived, never accepted from a query parameter.
export function leaveBalanceScope(auth: AuthClaims): Record<string, unknown> {
  if (['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(auth.role)) return {};
  if (!auth.employeeId) throw new ApiError(403, 'No employee profile linked', 'PROFILE_NOT_LINKED');
  if (auth.role === 'MANAGER') return { $or: [
    { _id: auth.employeeId },
    { 'employment.reviewer': auth.employeeId },
    { 'employment.reportingManager': auth.employeeId },
  ] };
  if (auth.role === 'EMPLOYEE') return { _id: auth.employeeId };
  throw new ApiError(403, 'Permission denied', 'FORBIDDEN');
}

export async function listLeaveBalances(auth: AuthClaims, input: z.infer<typeof balanceFilters>) {
  const clauses: Record<string, unknown>[] = [leaveBalanceScope(auth)];
  if (input.employee) clauses.push({ _id: input.employee });
  if (input.search) {
    const literal = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clauses.push({ $or: [{ employeeId: { $regex: literal, $options: 'i' } }, { fullName: { $regex: literal, $options: 'i' } }] });
  }
  const filter = { $and: clauses };
  const pageSize = 25;
  const [total, types] = await Promise.all([
    Employee.countDocuments(filter),
    LeaveType.find({ active: true }).select('code name entitlementMode').sort({ code: 1 }).lean(),
  ]);
  const page = Math.min(input.page, Math.max(1, Math.ceil(total / pageSize)));
  const employees = await Employee.find(filter)
    .select('employeeId fullName employment.department employment.status employment.employmentType employment.confirmationDate')
    .populate('employment.department', 'name').sort({ employeeId: 1, _id: 1 })
    .skip((page - 1) * pageSize).limit(pageSize).lean();
  const entries = employees.length ? await LeaveLedgerEntry.find({ employee: { $in: employees.map((employee) => employee._id) }, year: input.year })
    .select('employee leaveType type amount').lean() : [];
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = `${entry.employee}:${entry.leaveType}`;
    const group = grouped.get(key) ?? [];
    group.push(entry); grouped.set(key, group);
  }
  const now = new Date();
  return {
    year: input.year, page, pageSize, total, scope: ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(auth.role) ? 'ALL' : auth.role === 'MANAGER' ? 'TEAM' : 'SELF',
    leaveTypes: types,
    rows: employees.map((employee) => ({
      _id: employee._id, employeeId: employee.employeeId, fullName: employee.fullName,
      department: employee.employment?.department, status: employee.employment?.status,
      eligible: isConfirmedPermanent({ employment: { employmentType: employee.employment?.employmentType ?? undefined, confirmationDate: employee.employment?.confirmationDate, status: employee.employment?.status } }, now),
      balances: types.map((type) => ({ leaveType: type._id, ...summarizeLedger(grouped.get(`${employee._id}:${type._id}`) ?? []) })),
    })),
  };
}
