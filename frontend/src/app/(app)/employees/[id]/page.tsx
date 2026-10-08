'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';

type Employee = { _id: string; employeeId: string; fullName: string; candidateId?: string; title?: string; personal?: { phone?: string; personalEmail?: string; dateOfBirth?: string; bloodGroup?: string }; employment: { department?: { name: string }; section?: { name: string }; designation?: { name: string }; reportingManager?: { fullName: string }; employeeType: string; status: string; joiningDate: string; location?: string; grade?: string } };
type ProfileData = { contact?: Record<string, unknown>; identity?: Record<string, unknown>; family: unknown[]; education: unknown[]; experience: unknown[]; identityRestricted: boolean };
const tabs = ['Overview', 'Personal', 'Employment', 'Organization', 'Contact', 'Family', 'Emergency', 'Education', 'Experience', 'Documents', 'Attendance', 'Leave', 'Payroll', 'Benefits', 'Assets', 'Performance', 'Training', 'Audit history'];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null); const [profile, setProfile] = useState<ProfileData | null>(null); const [tab, setTab] = useState('Overview'); const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.get<Employee>(`/employees/${id}`), api.get<ProfileData>(`/employees/${id}/profile-data`)]).then(([record, data]) => { setEmployee(record); setProfile(data); }).catch((reason) => setError(reason.message)); }, [id]);
  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!employee) return <div className="card h-64 animate-pulse bg-slate-100"/>;
  const rows = [
    ['Employee ID', employee.employeeId], ['Status', employee.employment.status], ['Department', employee.employment.department?.name], ['Designation', employee.employment.designation?.name], ['Employee type', employee.employment.employeeType], ['Joining date', new Date(employee.employment.joiningDate).toLocaleDateString()], ['Location', employee.employment.location], ['Reporting manager', employee.employment.reportingManager?.fullName],
  ];
  return <><PageHeader title={employee.fullName} description={`${employee.employeeId} · ${employee.employment.designation?.name ?? 'Designation not assigned'}`} action={<Link href={`/employees/${id}/edit`} className="btn-primary">Edit employee</Link>}/>
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"><div className="grid size-14 place-items-center rounded-full bg-sky-50 text-xl font-bold text-[#176b9c]">{employee.fullName.charAt(0)}</div><div><div className="font-bold">{employee.title ? `${employee.title} ` : ''}{employee.fullName}</div><div className="mt-1"><StatusBadge value={employee.employment.status}/></div></div></div>
    <div className="mb-5 overflow-x-auto border-b border-slate-200"><div className="flex min-w-max gap-1">{tabs.map((item) => <button key={item} className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === item ? 'border-[#176b9c] text-[#176b9c]' : 'border-transparent text-slate-500 hover:text-slate-800'}`} onClick={() => setTab(item)}>{item}</button>)}</div></div>
    {tab === 'Overview' && <div className="grid gap-5 lg:grid-cols-2"><section className="card p-5"><h2 className="font-bold">Employee summary</h2><dl className="mt-4 grid grid-cols-2 gap-x-4">{rows.map(([label, value]) => <div className="contents" key={label}><dt className="border-b border-slate-100 py-3 text-sm text-slate-500">{label}</dt><dd className="border-b border-slate-100 py-3 text-sm font-semibold">{value || '—'}</dd></div>)}</dl></section><section className="card p-5"><h2 className="font-bold">Profile records</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Contact profile</dt><dd className="font-semibold">{profile?.contact ? 'Available' : 'Not completed'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Family members</dt><dd className="font-semibold">{profile?.family.length ?? 0}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Education records</dt><dd className="font-semibold">{profile?.education.length ?? 0}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Experience records</dt><dd className="font-semibold">{profile?.experience.length ?? 0}</dd></div></dl></section></div>}
    {tab !== 'Overview' && <section className="card p-8 text-center"><h2 className="font-bold">{tab}</h2><p className="mt-2 text-sm text-slate-500">{tab === 'Personal' && profile?.identityRestricted ? 'Sensitive identity details are restricted for your role.' : 'No records are available in this section yet.'}</p></section>}
  </>;
}
