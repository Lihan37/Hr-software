export type CorrectionStatus = 'SUBMITTED' | 'PENDING_MANAGER' | 'PENDING_HR' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export function nextCorrectionStatus(current: CorrectionStatus, role: string, action: 'APPROVE' | 'REJECT'): CorrectionStatus {
  if (action === 'REJECT' && ((current === 'PENDING_MANAGER' && role === 'MANAGER') || (current === 'PENDING_HR' && ['HR', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role)))) return 'REJECTED';
  if (action === 'APPROVE' && current === 'PENDING_MANAGER' && role === 'MANAGER') return 'PENDING_HR';
  if (action === 'APPROVE' && current === 'PENDING_HR' && ['HR', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role)) return 'APPROVED';
  throw new Error('This decision is not allowed at the current workflow stage');
}
