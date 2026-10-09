'use client';

import { MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/api';

type Location = { _id: string; name: string; code: string; address?: string; timezone?: string; active: boolean };

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLocations(await api.get<Location[]>('/organization/locations'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Locations could not be loaded');
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(form: FormData) {
    setError('');
    try {
      await api.post('/organization/locations', {
        name: form.get('name'),
        code: form.get('code'),
        address: form.get('address') || undefined,
        timezone: form.get('timezone') || 'Asia/Dhaka',
        active: true,
      });
      (document.getElementById('location-form') as HTMLFormElement)?.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Location could not be saved');
    }
  }

  return <>
    <PageHeader title="Locations" description="Create the controlled office and work locations available when an employee is created."/>
    {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Location</th><th>Code</th><th>Timezone</th><th>Status</th></tr></thead>
          <tbody>
            {locations.map((location) => <tr key={location._id}><td><div className="font-semibold">{location.name}</div><div className="max-w-md text-xs text-slate-500">{location.address || 'No address provided'}</div></td><td>{location.code}</td><td>{location.timezone || 'Asia/Dhaka'}</td><td><StatusBadge value={location.active ? 'ACTIVE' : 'INACTIVE'}/></td></tr>)}
            {!locations.length && <tr><td colSpan={4} className="py-12 text-center text-slate-500">No locations have been created.</td></tr>}
          </tbody>
        </table>
      </div>
      <form id="location-form" action={create} className="card h-fit space-y-4 p-5">
        <div className="flex items-center gap-2 font-bold"><Plus size={18}/>Add location</div>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Name</span><input name="name" required className="field" placeholder="Dhaka Head Office"/></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Code</span><input name="code" required className="field uppercase" placeholder="DHK-HO"/></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Address</span><textarea name="address" className="field" rows={3}/></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">Timezone</span><input name="timezone" className="field" defaultValue="Asia/Dhaka"/></label>
        <button className="btn-primary flex w-full items-center justify-center gap-2"><MapPin size={16}/>Save location</button>
      </form>
    </div>
  </>;
}
