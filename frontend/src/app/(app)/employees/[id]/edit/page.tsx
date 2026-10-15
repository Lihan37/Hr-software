'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

type Ref = { _id: string; name: string; code: string; active?: boolean };
type Personal = { fatherName?: string; motherName?: string; dateOfBirth?: string; gender?: string; bloodGroup?: string; nationality?: string; religion?: string; maritalStatus?: string; heightCm?: number; weightKg?: number; specialSkills?: string };
type Employee = { firstName?: string; middleName?: string; lastName?: string; title?: string; personal?: Personal; employment: { status: string; workforceType?: string; businessUnit?: string; branch?: string; costCenter?: string; employeeBand?: string; locationRef?: { _id: string; name: string }; location?: string; grade?: string; joiningSource?: string } };
type Refs = { businessUnits: Ref[]; branches: Ref[]; costCenters: Ref[]; employeeLevels: Ref[]; locations: Ref[] };

function dateValue(value?: string) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }

function ControlledSelect({ name, label, current, options }: { name: string; label: string; current?: string; options: Ref[] }) {
  const active = options.filter((item) => item.active !== false);
  const hasCurrent = !!current && active.some((item) => item.name === current);
  return <label><span className="mb-1 block text-sm font-semibold">{label}</span><select name={name} defaultValue={current ?? ''} className="field"><option value="">Select...</option>{current && !hasCurrent && <option value={current}>{current} (historical)</option>}{active.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}</select></label>;
}

export default function EditEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [refs, setRefs] = useState<Refs>({ businessUnits: [], branches: [], costCenters: [], employeeLevels: [], locations: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Employee>(`/employees/${id}`),
      api.get<Ref[]>('/organization/business-units'),
      api.get<Ref[]>('/organization/branches'),
      api.get<Ref[]>('/organization/cost-centers'),
      api.get<Ref[]>('/organization/employee-levels'),
      api.get<Ref[]>('/organization/locations'),
    ]).then(([record, businessUnits, branches, costCenters, employeeLevels, locations]) => { setEmployee(record); setRefs({ businessUnits, branches, costCenters, employeeLevels, locations }); }).catch((reason) => setError(reason.message));
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => { const item = form.get(name); return typeof item === 'string' ? item.trim() : ''; };
    setSaving(true); setError('');
    try {
      await api.patch(`/employees/${id}`, {
        title: value('title') || undefined,
        firstName: value('firstName'), middleName: value('middleName') || undefined, lastName: value('lastName') || undefined,
        personal: { fatherName: value('fatherName') || undefined, motherName: value('motherName') || undefined, dateOfBirth: value('dateOfBirth') || undefined, gender: value('gender') || undefined, bloodGroup: value('bloodGroup') || undefined, nationality: value('nationality') || undefined, religion: value('religion') || undefined, maritalStatus: value('maritalStatus') || undefined, heightCm: value('heightCm') || undefined, weightKg: value('weightKg') || undefined, specialSkills: value('specialSkills') || undefined },
        employment: { status: value('status'), workforceType: value('workforceType'), businessUnit: value('businessUnit'), branch: value('branch'), costCenter: value('costCenter'), employeeBand: value('employeeBand'), locationRef: value('locationRef') || null, grade: value('grade') || undefined, joiningSource: value('joiningSource') || undefined },
      });
      router.push(`/employees/${id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Update failed'); setSaving(false); }
  }

  if (!employee) return error ? <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div> : <div className="card h-64 animate-pulse bg-slate-100"/>;
  const personal = employee.personal ?? {};
  return <>
    <PageHeader title="Edit employee" description="Update personal and employment information. Changes are audit logged."/>
    {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}
    <form onSubmit={submit} className="card max-w-5xl">
      <div className="border-b border-slate-200 bg-slate-50 p-5"><h2 className="font-bold">Personal information</h2><p className="mt-1 text-sm text-slate-500">Employee identity and personal details.</p></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm font-semibold">Title</span><input name="title" defaultValue={employee.title} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">First name</span><input name="firstName" defaultValue={employee.firstName} required className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Middle name</span><input name="middleName" defaultValue={employee.middleName} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Last name</span><input name="lastName" defaultValue={employee.lastName} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Father&apos;s name</span><input name="fatherName" defaultValue={personal.fatherName} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Mother&apos;s name</span><input name="motherName" defaultValue={personal.motherName} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Date of birth</span><input name="dateOfBirth" type="date" defaultValue={dateValue(personal.dateOfBirth)} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Gender</span><select name="gender" defaultValue={personal.gender ?? ''} className="field"><option value="">Select...</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="UNDISCLOSED">Undisclosed</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold">Blood group</span><input name="bloodGroup" defaultValue={personal.bloodGroup} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Nationality</span><input name="nationality" defaultValue={personal.nationality} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Religion</span><input name="religion" defaultValue={personal.religion} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Marital status</span><select name="maritalStatus" defaultValue={personal.maritalStatus ?? ''} className="field"><option value="">Select...</option><option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="DIVORCED">Divorced</option><option value="WIDOWED">Widowed</option><option value="UNDISCLOSED">Undisclosed</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold">Height (cm)</span><input name="heightCm" type="number" defaultValue={personal.heightCm} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Weight (kg)</span><input name="weightKg" type="number" defaultValue={personal.weightKg} className="field"/></label>
        <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Special training / skills</span><textarea name="specialSkills" defaultValue={personal.specialSkills} className="field" rows={3}/></label>
      </div>
      <div className="border-y border-slate-200 bg-slate-50 p-5"><h2 className="font-bold">Employment information</h2><p className="mt-1 text-sm text-slate-500">Controlled employment and organization values.</p></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label><span className="mb-1 block text-sm font-semibold">Job Status</span><select name="status" defaultValue={employee.employment.status} className="field"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option><option value="SEPARATED">Separated</option></select></label>
        <label><span className="mb-1 block text-sm font-semibold">Employee Type</span><select name="workforceType" defaultValue={employee.employment.workforceType ?? 'LOCAL'} className="field"><option value="LOCAL">Local</option><option value="EXPAT">Expat</option></select></label>
        <ControlledSelect name="businessUnit" label="Business Unit" current={employee.employment.businessUnit} options={refs.businessUnits}/>
        <ControlledSelect name="branch" label="Branch" current={employee.employment.branch} options={refs.branches}/>
        <ControlledSelect name="costCenter" label="Cost Center" current={employee.employment.costCenter} options={refs.costCenters}/>
        <ControlledSelect name="employeeBand" label="Employee Level" current={employee.employment.employeeBand} options={refs.employeeLevels}/>
        <label><span className="mb-1 block text-sm font-semibold">Location</span><select name="locationRef" defaultValue={employee.employment.locationRef?._id ?? ''} className="field"><option value="">Select...</option>{refs.locations.filter((item) => item.active !== false).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
        <label><span className="mb-1 block text-sm font-semibold">Grade</span><input name="grade" defaultValue={employee.employment.grade} className="field"/></label>
        <label><span className="mb-1 block text-sm font-semibold">Joining source (optional)</span><select name="joiningSource" defaultValue={employee.employment.joiningSource ?? ''} className="field"><option value="">Select...</option><option>New position</option><option>Replacement</option><option>Internal transfer</option><option>Recruitment</option><option>Other</option></select></label>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 p-5"><Link href={`/employees/${id}`} className="btn-secondary">Cancel</Link><button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
    </form>
  </>;
}
