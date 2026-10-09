export const roles = ['SUPER_ADMIN', 'HR_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  'employee:read:self', 'employee:read:team', 'employee:read:any', 'employee:write',
  'org:manage', 'attendance:read:self', 'attendance:read:team', 'attendance:read:any',
  'attendance:write', 'correction:create:self', 'correction:review:manager',
  'correction:review:hr', 'leave:read:self', 'leave:read:team', 'leave:read:any',
  'leave:create:self', 'leave:review:manager', 'leave:review:hr', 'leave:configure',
  'user:manage', 'audit:read', 'biometric:manage'
  , 'employee:type:manage', 'trainee:view', 'trainee:manage', 'trainee:convert',
  'probation:view', 'probation:evaluate:manager', 'probation:evaluate:hr', 'probation:finalize',
  'contract:view', 'contract:manage', 'employee:lifecycle:view', 'employee:lifecycle:manage', 'notification:hr:view'
] as const;
export type Permission = (typeof permissions)[number];

export interface AuthClaims {
  sub: string;
  role: Role;
  employeeId?: string;
  type: 'access';
}
