'use client';

import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';

interface Item { _id:string; name:string; code:string; active:boolean; description?:string }
type Resource = 'departments' | 'designations' | 'business-units' | 'branches' | 'cost-centers' | 'employee-levels';
const resources: Array<{ value: Resource; label: string; singular: string }> = [
  { value: 'departments', label: 'Departments', singular: 'department' },
  { value: 'designations', label: 'Designations', singular: 'designation' },
  { value: 'business-units', label: 'Business units', singular: 'business unit' },
  { value: 'branches', label: 'Branches', singular: 'branch' },
  { value: 'cost-centers', label: 'Cost centers', singular: 'cost center' },
  { value: 'employee-levels', label: 'Employee levels', singular: 'employee level' },
];

export default function OrganizationPage() {
  const [tab, setTab] = useState<Resource>('departments');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState('');
  const current = resources.find((resource) => resource.value === tab)!;
  const load = () => api.get<Item[]>(`/organization/${tab}`).then(setItems).catch((reason) => setError(reason.message));
  useEffect(() => { void load(); }, [tab]);
  const create = async (form: FormData) => { try { await api.post(`/organization/${tab}`, { name: form.get('name'), code: form.get('code'), active: true }); await load(); (document.getElementById('org-form') as HTMLFormElement)?.reset(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save'); } };

  return <>
    <PageHeader title="Organization" description="Manage the controlled options used by employee records and forms."/>
    <div className="mb-4 flex flex-wrap gap-2">{resources.map((resource) => <button key={resource.value} className={tab === resource.value ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab(resource.value)}>{resource.label}</button>)}</div>
    {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="card table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td className="font-semibold">{item.name}</td><td>{item.code}</td><td><StatusBadge value={item.active ? 'ACTIVE' : 'INACTIVE'}/></td></tr>)}{!items.length && <tr><td colSpan={3} className="py-10 text-center text-slate-500">No {current.label.toLowerCase()} configured.</td></tr>}</tbody></table></div>
      <form id="org-form" action={create} className="card h-fit space-y-4 p-5"><div className="flex items-center gap-2 font-bold"><Plus size={18}/>Add {current.singular}</div><label className="block"><span className="mb-1 block text-sm font-semibold">Name</span><input name="name" required className="field"/></label><label className="block"><span className="mb-1 block text-sm font-semibold">Code</span><input name="code" required className="field uppercase"/></label><button className="btn-primary w-full">Save</button></form>
    </div>
  </>;
}
