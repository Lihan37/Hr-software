import type { Permission, Role } from '../../types/auth.js';

const all: Permission[] = [
  'employee:read:self', 'employee:read:team', 'employee:read:any', 'employee:write', 'org:manage',
  'attendance:read:self', 'attendance:read:team', 'attendance:read:any', 'attendance:write',
  'correction:create:self', 'correction:review:manager', 'correction:review:hr',
  'leave:read:self', 'leave:read:team', 'leave:read:any', 'leave:create:self',
  'leave:review:manager', 'leave:review:hr', 'leave:configure', 'user:manage', 'audit:read', 'biometric:manage'
];

export const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: all,
  HR_ADMIN: all.filter((permission) => permission !== 'biometric:manage'),
  HR: ['employee:read:self', 'employee:read:any', 'employee:write', 'attendance:read:self', 'attendance:read:any', 'attendance:write', 'correction:create:self', 'correction:review:hr', 'leave:read:self', 'leave:read:any', 'leave:create:self', 'leave:review:hr', 'audit:read'],
  MANAGER: ['employee:read:self', 'employee:read:team', 'attendance:read:self', 'attendance:read:team', 'correction:create:self', 'correction:review:manager', 'leave:read:self', 'leave:read:team', 'leave:create:self', 'leave:review:manager'],
  EMPLOYEE: ['employee:read:self', 'attendance:read:self', 'correction:create:self', 'leave:read:self', 'leave:create:self']
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
