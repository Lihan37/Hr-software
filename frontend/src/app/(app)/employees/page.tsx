'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';

type Ref = { _id: string; name: string; code: string };
type Employee = { _id: string; employeeId: string; fullName: string; employment: { department?: Ref; designation?: Ref; employeeType: string; status: string; location?: string } };

export default function EmployeeMasterPage() {
  const [items, setItems] = useState<Employee[]>([]); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  async function load(nextPage = page) { setLoading(true); setError(''); try { setItems(await api.get<Employee[]>(`/employees?page=${nextPage}&limit=25&search=${encodeURIComponent(search)}${status ? `&status=${status}` : ''}`)); setPage(nextPage); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load employees'); } finally { setLoading(false); } }
  useEffect(() => { void load(1); }, []);
  return <><PageHeader title="Employee master" description="Search and manage the employee identity shared by every HR module." action={<Link href="/employees/new" className="btn-primary flex items-center gap-2"><Plus size={17}/>New employee</Link>}/>
    {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <section className="card"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row"><form className="relative flex-1" onSubmit={(event) => { event.preventDefault(); void load(1); }}><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name or ID"/></form><select className="field lg:w-48" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option><option>SEPARATED</option></select><button className="btn-secondary" onClick={() => void load(1)}>Apply filters</button></div>
      <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Type</th><th>Location</th><th>Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="py-12 text-center text-slate-500">Loading employees…</td></tr> : items.map((employee) => <tr key={employee._id}><td><Link href={`/employees/${employee._id}`} className="font-semibold text-[#176b9c] hover:underline">{employee.fullName}</Link><div className="text-xs text-slate-500">{employee.employeeId}</div></td><td>{employee.employment.department?.name ?? '—'}</td><td>{employee.employment.designation?.name ?? '—'}</td><td>{employee.employment.employeeType}</td><td>{employee.employment.location ?? '—'}</td><td><StatusBadge value={employee.employment.status}/></td></tr>)}{!loading && items.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-500">No employees match these filters.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-slate-200 p-4"><span className="text-sm text-slate-500">Page {page}</span><div className="flex gap-2"><button className="btn-secondary" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</button><button className="btn-secondary" disabled={items.length < 25 || loading} onClick={() => void load(page + 1)}>Next</button></div></div>
    </section></>;
}
