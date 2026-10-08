const colors: Record<string, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700', APPROVED: 'bg-emerald-50 text-emerald-700', ACTIVE: 'bg-emerald-50 text-emerald-700',
  ABSENT: 'bg-red-50 text-red-700', REJECTED: 'bg-red-50 text-red-700',
  LEAVE: 'bg-sky-50 text-sky-700', PENDING_MANAGER: 'bg-amber-50 text-amber-700', PENDING_HR: 'bg-amber-50 text-amber-700',
  MISSING_PUNCH: 'bg-orange-50 text-orange-700', WEEKLY_OFF: 'bg-slate-100 text-slate-600', PUBLIC_HOLIDAY: 'bg-violet-50 text-violet-700'
};
export function StatusBadge({ value }: { value: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${colors[value] ?? 'bg-slate-100 text-slate-700'}`}>{value.replaceAll('_', ' ')}</span>; }
