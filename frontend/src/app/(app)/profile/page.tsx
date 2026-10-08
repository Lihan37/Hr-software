'use client';

import { Mail, MapPin, Phone, UserCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { useAuth } from '@/features/auth/auth-provider';
import { api } from '@/lib/api';

interface EmployeeProfile {
  employeeId: string;
  fullName: string;
  profilePhoto?: { url: string };
  personal?: { phone?: string; personalEmail?: string; nationality?: string; bloodGroup?: string; dateOfBirth?: string; presentAddress?: { city?: string; district?: string }; emergencyContact?: { name?: string; phone?: string; relationship?: string } };
  employment: { department?: { name: string }; section?: { name: string }; designation?: { name: string }; grade?: string; employeeType: string; joiningDate: string; confirmationDate?: string; status: string; reportingManager?: { fullName: string; employeeId: string }; location?: string; costCenter?: string; workShift?: string };
}

const Detail = ({ label, value }: { label: string; value?: React.ReactNode }) => <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1.5 text-sm font-semibold text-slate-800">{value || '—'}</dd></div>;

export default function ProfilePage() {
  const { user } = useAuth(); const [profile, setProfile] = useState<EmployeeProfile | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (user?.employee?._id) api.get<EmployeeProfile>(`/employees/${user.employee._id}`).then(setProfile).catch((reason) => setError(reason.message)); }, [user?.employee?._id]);
  return <><PageHeader title="My profile" description="Your employee master record and reporting details."/>{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</div>}{profile ? <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><aside className="card h-fit p-6 text-center">{profile.profilePhoto?.url ? <img src={profile.profilePhoto.url} alt="Profile" className="mx-auto size-24 rounded-full object-cover"/> : <div className="mx-auto grid size-24 place-items-center rounded-full bg-slate-100 text-slate-400"><UserCircle size={54}/></div>}<h2 className="mt-4 text-xl font-bold">{profile.fullName}</h2><p className="mt-1 text-sm text-slate-500">{profile.employeeId}</p><div className="mt-3"><StatusBadge value={profile.employment.status}/></div><div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-left text-sm text-slate-600">{profile.personal?.phone && <div className="flex items-center gap-2"><Phone size={16}/>{profile.personal.phone}</div>}{profile.personal?.personalEmail && <div className="flex items-center gap-2"><Mail size={16}/>{profile.personal.personalEmail}</div>}{profile.employment.location && <div className="flex items-center gap-2"><MapPin size={16}/>{profile.employment.location}</div>}</div></aside><div className="space-y-6"><section className="card p-6"><h2 className="mb-5 font-bold">Employment information</h2><dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"><Detail label="Department" value={profile.employment.department?.name}/><Detail label="Section" value={profile.employment.section?.name}/><Detail label="Designation" value={profile.employment.designation?.name}/><Detail label="Employee type" value={profile.employment.employeeType}/><Detail label="Grade" value={profile.employment.grade}/><Detail label="Joining date" value={new Date(profile.employment.joiningDate).toLocaleDateString()}/><Detail label="Reporting manager" value={profile.employment.reportingManager?.fullName}/><Detail label="Work shift" value={profile.employment.workShift}/><Detail label="Cost center" value={profile.employment.costCenter}/></dl></section><section className="card p-6"><h2 className="mb-5 font-bold">Personal information</h2><dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"><Detail label="Nationality" value={profile.personal?.nationality}/><Detail label="Blood group" value={profile.personal?.bloodGroup}/><Detail label="Date of birth" value={profile.personal?.dateOfBirth ? new Date(profile.personal.dateOfBirth).toLocaleDateString() : undefined}/><Detail label="Present city" value={profile.personal?.presentAddress?.city}/><Detail label="Emergency contact" value={profile.personal?.emergencyContact?.name}/><Detail label="Emergency phone" value={profile.personal?.emergencyContact?.phone}/></dl></section></div></div> : !error && <div className="card h-80 animate-pulse bg-slate-100"/>}</>;
}
