'use client';

import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api';

type Ref = { _id: string; name: string; code: string; active?: boolean };
type Created = { _id: string };
export default function NewEmployeePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [refs, setRefs] = useState<{ departments: Ref[]; designations: Ref[]; traineeTypes: Ref[]; locations: Ref[] }>({ departments: [], designations: [], traineeTypes: [], locations: [] });
  const [employmentType, setEmploymentType] = useState('PERMANENT');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { Promise.all([api.get<Ref[]>('/organization/departments'), api.get<Ref[]>('/organization/designations'), api.get<Ref[]>('/lifecycle/trainee-types'), api.get<Ref[]>('/organization/locations')]).then(([departments, designations, traineeTypes, locations]) => setRefs({ departments, designations, traineeTypes, locations })).catch((reason) => setError(reason.message)); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true); setError('');
    try {
      const employee = await api.post<Created>('/employees', {
        employeeId: form.get('employeeId') || undefined, title: form.get('title') || undefined,
        firstName: form.get('firstName') || undefined, middleName: form.get('middleName') || undefined, lastName: form.get('lastName') || undefined,
        employment: { department: form.get('department'), designation: form.get('designation'), employeeType: employmentType === 'PROBATION' ? 'PROBATIONARY' : employmentType, employmentType, joiningDate: form.get('joiningDate'), status: 'ACTIVE', locationRef: form.get('locationRef') || undefined, grade: form.get('grade') || undefined, traineeType: form.get('traineeType') || undefined, traineeStartDate: form.get('traineeStartDate') || undefined, expectedCompletionDate: form.get('expectedCompletionDate') || undefined, traineeRemarks: form.get('traineeRemarks') || undefined, traineeReminderDays: form.get('traineeReminderDays') || undefined, probationStartDate: form.get('probationStartDate') || undefined, probationEndDate: form.get('probationEndDate') || undefined, probationDurationMonths: form.get('probationDurationMonths') || undefined, probationReminderDays: form.get('probationReminderDays') || undefined, contractStartDate: form.get('contractStartDate') || undefined, contractEndDate: form.get('contractEndDate') || undefined, contractNotes: form.get('contractNotes') || undefined, contractReminderDays: form.get('contractReminderDays') || undefined, confirmationDate: form.get('confirmationDate') || undefined },
      });
      router.push(`/employees/${employee._id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Employee could not be created'); setSaving(false); }
  }

  return <><PageHeader title="Create employee" description="Enter the employee's master and employment details on one scrollable page. Full name is generated from the name fields."/>
    {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="card">
      <div className="border-b border-slate-200 p-5"><h2 className="font-bold">Employee information</h2><p className="mt-1 text-sm text-slate-500">Complete the required master and employment information below.</p></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm font-semibold">Employee ID</span><input name="employeeId" required={employmentType !== 'TRAINEE'} disabled={employmentType === 'TRAINEE'} className="field disabled:bg-slate-100" placeholder={employmentType === 'TRAINEE' ? 'Generated automatically' : 'EMP-000001'}/></label>
        <label><span className="mb-1 block text-sm font-semibold">Title</span><input name="title" className="field" placeholder="Mr / Ms / Dr"/></label>
        <label><span className="mb-1 block text-sm font-semibold">First name</span><input name="firstName" required className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Middle name</span><input name="middleName" className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Last name</span><input name="lastName" className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Employment type</span><select name="employmentType" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)} className="field"><option value="PERMANENT">Permanent</option><option value="PROBATION">Probation</option><option value="CONTRACTUAL">Contractual</option><option value="TRAINEE">Trainee</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold">Joining date</span><input name="joiningDate" type="date" required className="field"/></label>
        {employmentType === 'TRAINEE' && <><label><span className="mb-1 block text-sm font-semibold">Trainee type</span><select name="traineeType" required className="field"><option value="">Select...</option>{refs.traineeTypes.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label><span className="mb-1 block text-sm font-semibold">Trainee start date</span><input name="traineeStartDate" type="date" required className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Expected completion</span><input name="expectedCompletionDate" type="date" className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Reminder before completion (days)</span><input name="traineeReminderDays" type="number" min="0" max="180" className="field" placeholder="Use organization default"/></label><label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Trainee remarks</span><textarea name="traineeRemarks" className="field" rows={3}/></label></>}
        {employmentType === 'PROBATION' && <><label><span className="mb-1 block text-sm font-semibold">Probation start</span><input name="probationStartDate" type="date" required className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Probation duration (months)</span><input name="probationDurationMonths" type="number" min="1" max="36" className="field" placeholder="Use organization default"/></label><label><span className="mb-1 block text-sm font-semibold">Probation end override</span><input name="probationEndDate" type="date" className="field"/><span className="mt-1 block text-xs text-slate-500">Leave blank to calculate it from the employee duration.</span></label><label><span className="mb-1 block text-sm font-semibold">Reminder before end (days)</span><input name="probationReminderDays" type="number" min="0" max="180" className="field" placeholder="Use organization default"/></label></>}
        {employmentType === 'CONTRACTUAL' && <><label><span className="mb-1 block text-sm font-semibold">Contract start</span><input name="contractStartDate" type="date" required className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Contract end</span><input name="contractEndDate" type="date" required className="field"/></label><label><span className="mb-1 block text-sm font-semibold">Reminder before expiry (days)</span><input name="contractReminderDays" type="number" min="0" max="365" className="field" placeholder="Use organization default"/></label><label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Contract notes</span><textarea name="contractNotes" className="field" rows={3}/></label></>}
        {employmentType === 'PERMANENT' && <label><span className="mb-1 block text-sm font-semibold">Confirmation date</span><input name="confirmationDate" type="date" className="field"/></label>}
        <label><span className="mb-1 block text-sm font-semibold">Department</span><select name="department" required className="field"><option value="">Select…</option>{refs.departments.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold">Designation</span><select name="designation" required className="field"><option value="">Select…</option>{refs.designations.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold">Grade</span><input name="grade" className="field"/></label>
        <label><span className="mb-1 flex items-center justify-between gap-3 text-sm font-semibold"><span>Location</span>{user && ['SUPER_ADMIN', 'HR_ADMIN'].includes(user.role) && <Link href="/administration/locations" className="text-xs font-medium text-[#176b9c] hover:underline">Manage locations</Link>}</span><select name="locationRef" className="field"><option value="">Select...</option>{refs.locations.filter((item) => item.active !== false).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <div className="sm:col-span-2 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">Contact, family, identity, payroll, and bank information can be added from the employee profile after creation. Login access is provisioned separately.</div>
      </div>
      <div className="flex justify-between border-t border-slate-200 p-5"><Link href="/employees" className="btn-secondary inline-flex items-center gap-2"><ArrowLeft size={16}/>Cancel</Link><button className="btn-primary flex items-center gap-2" disabled={saving}>{saving ? 'Creating...' : 'Create employee'}<Check size={16}/></button></div>
    </form></>;
}
