'use client';

import { CalendarDays, CheckCircle2, Clock3, FileWarning, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';
import type { DashboardData } from '@/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState('');
  useEffect(() => { api.get<DashboardData>('/dashboard').then(setData).catch((e) => setError(e.message)); }, []);
  const cards = data ? [
    ['Active employees', data.activeEmployees, Users, 'Across your access scope'], ['Present today', data.presentToday, CheckCircle2, 'Recorded attendance'],
    ['On leave', data.onLeaveToday, CalendarDays, 'Approved leave'], ['Pending approvals', data.pendingLeave + data.pendingCorrections, FileWarning, 'Leave and corrections'],
    ['Probation evaluations', data.probationEvaluationsDue, FileWarning, 'Due soon, today, or overdue']
  ] as const : [];
  return <><PageHeader title="Dashboard" description="Today’s workforce position and the work that needs your attention."/>{error && <div className="mb-5 rounded-md bg-red-50 p-4 text-red-700">{error}</div>}<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data ? cards.map(([label,value,Icon,note]) => <article className="card p-5" key={label}><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-[#142b40]">{value}</p></div><div className="grid size-10 place-items-center rounded-lg bg-sky-50 text-[#176b9c]"><Icon size={20}/></div></div><p className="mt-4 text-xs text-slate-500">{note}</p></article>) : Array.from({length:4}).map((_,i)=><div className="card h-36 animate-pulse bg-slate-100" key={i}/>)}</section><section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><article className="card"><div className="border-b border-slate-200 p-5"><h2 className="font-bold">Today’s attendance</h2><p className="mt-1 text-sm text-slate-500">Your latest check-in activity</p></div><div className="p-5">{data?.todayAttendance ? <div className="flex flex-wrap items-center gap-6"><div><div className="text-xs font-bold uppercase text-slate-500">Status</div><div className="mt-2"><StatusBadge value={data.todayAttendance.status}/></div></div><div><div className="text-xs font-bold uppercase text-slate-500">Check in</div><div className="mt-2 font-semibold">{data.todayAttendance.checkIn ? new Date(data.todayAttendance.checkIn).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</div></div><div><div className="text-xs font-bold uppercase text-slate-500">Check out</div><div className="mt-2 font-semibold">{data.todayAttendance.checkOut ? new Date(data.todayAttendance.checkOut).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</div></div></div> : <div className="flex items-center gap-3 py-5 text-slate-500"><Clock3 size={20}/>No attendance recorded today.</div>}</div></article><article className="card p-5"><h2 className="font-bold">Attendance summary</h2><dl className="mt-5 space-y-4"><div className="flex justify-between"><dt className="text-sm text-slate-600">Absent today</dt><dd className="font-bold">{data?.absentToday ?? '—'}</dd></div><div className="flex justify-between"><dt className="text-sm text-slate-600">Late arrivals</dt><dd className="font-bold">{data?.lateToday ?? '—'}</dd></div><div className="flex justify-between"><dt className="text-sm text-slate-600">Total team scope</dt><dd className="font-bold">{data?.totalEmployees ?? '—'}</dd></div></dl></article></section></>;
}
