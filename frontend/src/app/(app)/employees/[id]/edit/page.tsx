'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

type Employee = { fullName: string; candidateId?: string; title?: string; employment: { status: string; location?: string; grade?: string } };
export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const [employee, setEmployee] = useState<Employee | null>(null); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { api.get<Employee>(`/employees/${id}`).then(setEmployee).catch((reason) => setError(reason.message)); }, [id]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); setError(''); try { await api.patch(`/employees/${id}`, { fullName: form.get('fullName'), candidateId: form.get('candidateId') || undefined, title: form.get('title') || undefined, employment: { status: form.get('status'), location: form.get('location') || undefined, grade: form.get('grade') || undefined } }); router.push(`/employees/${id}`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Update failed'); setSaving(false); } }
  if (!employee) return error ? <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div> : <div className="card h-64 animate-pulse bg-slate-100"/>;
  return <><PageHeader title="Edit employee" description="Update controlled master fields. Changes are audit logged."/>{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}<form onSubmit={submit} className="card max-w-3xl"><div className="grid gap-4 p-5 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Title</span><input name="title" defaultValue={employee.title} className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Full name</span><input name="fullName" defaultValue={employee.fullName} required className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Candidate ID</span><input name="candidateId" defaultValue={employee.candidateId} className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Status</span><select name="status" defaultValue={employee.employment.status} className="field"><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option><option>SEPARATED</option></select></label><label><span className="mb-1 block text-sm font-semibold">Grade</span><input name="grade" defaultValue={employee.employment.grade} className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Location</span><input name="location" defaultValue={employee.employment.location} className="field"/></label></div><div className="flex justify-end gap-3 border-t border-slate-200 p-5"><Link href={`/employees/${id}`} className="btn-secondary">Cancel</Link><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form></>;
}
