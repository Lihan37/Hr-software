'use client';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

type Ref = { _id: string; name: string; code: string };
type Created = { _id: string };
const steps = ['Basic information', 'Employment', 'Organization', 'Contact & address', 'Family / emergency', 'Identity & documents', 'Payroll / bank', 'Review & create'];

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [refs, setRefs] = useState<{ departments: Ref[]; designations: Ref[] }>({ departments: [], designations: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([api.get<Ref[]>('/organization/departments'), api.get<Ref[]>('/organization/designations')]).then(([departments, designations]) => setRefs({ departments, designations })).catch((reason) => setError(reason.message)); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < steps.length - 1) { setStep((value) => value + 1); return; }
    const form = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try {
      const employee = await api.post<Created>('/employees', {
        employeeId: form.get('employeeId'), candidateId: form.get('candidateId') || undefined, title: form.get('title') || undefined,
        firstName: form.get('firstName') || undefined, middleName: form.get('middleName') || undefined, lastName: form.get('lastName') || undefined,
        fullName: form.get('fullName'),
        employment: { department: form.get('department'), designation: form.get('designation'), employeeType: form.get('employeeType'), joiningDate: form.get('joiningDate'), status: 'ACTIVE', location: form.get('location') || undefined, grade: form.get('grade') || undefined },
      });
      router.push(`/employees/${employee._id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Employee could not be created'); setSaving(false); }
  }

  return <><PageHeader title="Create employee" description="Create the master record in guided steps. Controlled and sensitive details can be completed after creation."/>
    <div className="mb-5 overflow-x-auto"><ol className="flex min-w-max gap-2">{steps.map((label, index) => <li key={label} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${index === step ? 'border-[#176b9c] bg-sky-50 text-[#176b9c]' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{index < step ? <Check size={14}/> : <span>{index + 1}</span>}{label}</li>)}</ol></div>
    {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="card">
      <div className="border-b border-slate-200 p-5"><h2 className="font-bold">{steps[step]}</h2><p className="mt-1 text-sm text-slate-500">Step {step + 1} of {steps.length}</p></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm font-semibold">Employee ID</span><input name="employeeId" required className="field" placeholder="EMP-000001"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Candidate ID</span><input name="candidateId" className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Title</span><input name="title" className="field" placeholder="Mr / Ms / Dr"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Full name</span><input name="fullName" required className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">First name</span><input name="firstName" className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Middle name</span><input name="middleName" className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Last name</span><input name="lastName" className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Employee type</span><select name="employeeType" className="field"><option>PERMANENT</option><option>PROBATIONARY</option><option>CONTRACTUAL</option><option>CASUAL</option><option>INTERN</option><option>TRAINEE</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold">Joining date</span><input name="joiningDate" type="date" required className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Department</span><select name="department" required className="field"><option value="">Select…</option>{refs.departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold">Designation</span><select name="designation" required className="field"><option value="">Select…</option>{refs.designations.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold">Grade</span><input name="grade" className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Location</span><input name="location" className="field"/></label>
        {step >= 3 && step < 7 && <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This section is stored in its restricted profile collection after the employee master is created. No placeholder data will be saved.</div>}
        {step === 6 && <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Payroll and bank data is unavailable until the payroll permission and encrypted financial profile are configured.</div>}
        {step === 7 && <div className="sm:col-span-2 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">Review the entered master data, then create. Login access is provisioned separately.</div>}
      </div>
      <div className="flex justify-between border-t border-slate-200 p-5"><div>{step === 0 ? <Link href="/employees" className="btn-secondary inline-flex items-center gap-2"><ArrowLeft size={16}/>Cancel</Link> : <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={16}/>Back</button>}</div><button className="btn-primary flex items-center gap-2" disabled={saving}>{step === steps.length - 1 ? <>{saving ? 'Creating…' : 'Create employee'}<Check size={16}/></> : <>Continue<ArrowRight size={16}/></>}</button></div>
    </form></>;
}
