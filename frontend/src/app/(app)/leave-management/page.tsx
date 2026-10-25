'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api';

interface Balance {
  leaveType: string; entitled: number; accrued: number; adjustments: number;
  used: number; pending: number; available: number;
}
interface Overview {
  year: number; page: number; pageSize: number; total: number; scope: 'ALL' | 'TEAM' | 'SELF';
  leaveTypes: { _id: string; code: string; name: string }[];
  rows: { _id: string; employeeId: string; fullName: string; department?: { name: string } | null; status: string; eligible: boolean; balances: Balance[] }[];
}

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [year, setYear] = useState(() => Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(new Date())));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError(''); setData(null);
    const params = new URLSearchParams({ year: String(year), page: String(page), search: query });
    api.get<Overview>(`/leave/balances/overview?${params}`).then((result) => {
      if (active) setData(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load leave balances');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, year, page, query, refresh]);

  const scopeDescription = user?.role === 'MANAGER'
    ? 'Your own balance and employees assigned to you as HOD/reviewer or reporting manager.'
    : user?.role === 'EMPLOYEE' ? 'Your own leave balances.' : 'Leave balances for all employees across the organization.';
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return <>
    <PageHeader title="Leave Management" description={scopeDescription} action={<Link href="/leave" className="btn-primary">My leave requests</Link>} />
    <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); setRefresh((value) => value + 1); }}>
      <label className="min-w-0 flex-1"><span className="mb-1 block text-sm font-semibold">Employee name or ID</span><input className="field" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Search permitted employees" /></label>
      <label><span className="mb-1 block text-sm font-semibold">Leave year</span><select aria-label="Leave year" className="field" value={year} onChange={(event) => { setYear(Number(event.target.value)); setPage(1); }}>
        {Array.from({ length: 12 }, (_, index) => Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', year: 'numeric' }).format(new Date())) + 1 - index).map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <button className="btn-secondary" type="submit">Search / Refresh</button>
    </form>
    <p className="mb-4 text-sm text-slate-600">Balances are calculated from the existing leave ledger, including pending reservations. No annual grants or accruals are created by viewing this page. Unconfirmed employees remain subject to the existing eligibility policy.</p>
    {loading && <div className="card p-6" role="status">Loading leave balances...</div>}
    {error && <div className="card p-6 text-red-700" role="alert">{error}<button className="btn-secondary ml-3" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div>}
    {!loading && data && <section className="card overflow-hidden">
      <div className="border-b border-slate-200 p-4"><h2 className="font-bold">{data.scope === 'ALL' ? 'All employee balances' : data.scope === 'TEAM' ? 'Team leave balances' : 'My leave balances'} — {data.year}</h2><p className="mt-1 text-sm text-slate-500">{data.total} employee{data.total === 1 ? '' : 's'} in your permitted scope</p></div>
      {!data.rows.length ? <p className="p-8 text-center text-slate-500">No employees found in your permitted scope.</p> : !data.leaveTypes.length ? <p className="p-8 text-center text-slate-500">No active leave types configured.</p> : <div className="table-wrap"><table>
        <caption className="sr-only">Employee leave balances for {data.year}, in days</caption>
        <thead><tr><th>Employee</th><th>Department</th><th>Leave type</th><th>Entitled</th><th>Accrued / Earned</th><th>Adjustments</th><th>Used</th><th>Pending</th><th>Ledger balance</th></tr></thead>
        <tbody>{data.rows.flatMap((employee) => employee.balances.map((balance, index) => {
          const type = data.leaveTypes.find((item) => item._id === balance.leaveType);
          return <tr key={`${employee._id}:${balance.leaveType}`}>
            <td>{index === 0 && <><div className="font-semibold">{employee.fullName}</div><div className="text-xs text-slate-500">{employee.employeeId} · {employee.status}</div>{!employee.eligible && <div className="mt-1 text-xs text-amber-800">Unconfirmed / not eligible for standard leave</div>}</>}</td>
            <td>{index === 0 ? employee.department?.name ?? 'Not assigned' : ''}</td>
            <td><span className="font-semibold">{type?.code}</span><span className="block text-xs text-slate-500">{type?.name}</span></td>
            <td>{balance.entitled}</td><td>{balance.accrued}</td><td>{balance.adjustments}</td><td>{balance.used}</td><td>{balance.pending}</td><td className="font-bold text-sky-800">{balance.available}</td>
          </tr>;
        }))}</tbody>
      </table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm">
        <span>Page {data.page} of {pages}</span><div className="flex gap-2"><button className="btn-secondary disabled:opacity-50" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</button><button className="btn-secondary disabled:opacity-50" disabled={data.page >= pages} onClick={() => setPage(data.page + 1)}>Next</button></div>
      </div>
    </section>}
  </>;
}
