'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, Building2, CalendarCheck, ChevronDown, ClipboardCheck, LogOut, Menu, ShieldCheck, UserCircle, Users, X } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: ['SUPER_ADMIN','HR_ADMIN','HR','MANAGER','EMPLOYEE'] },
  { label: 'My Profile', href: '/profile', icon: UserCircle, roles: ['SUPER_ADMIN','HR_ADMIN','HR','MANAGER','EMPLOYEE'] },
  { label: 'Employees', href: '/people/employees', icon: Users, roles: ['SUPER_ADMIN','HR_ADMIN','HR','MANAGER'] },
  { label: 'Organization', href: '/people/organization', icon: Building2, roles: ['SUPER_ADMIN','HR_ADMIN','HR'] },
  { label: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['SUPER_ADMIN','HR_ADMIN','HR','MANAGER','EMPLOYEE'] },
  { label: 'Leave', href: '/leave', icon: ClipboardCheck, roles: ['SUPER_ADMIN','HR_ADMIN','HR','MANAGER','EMPLOYEE'] },
  { label: 'Approvals', href: '/approvals', icon: ShieldCheck, roles: ['SUPER_ADMIN','HR_ADMIN','HR','MANAGER'] },
  { label: 'Administration', href: '/administration', icon: ShieldCheck, roles: ['SUPER_ADMIN','HR_ADMIN','HR'] }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth(); const pathname = usePathname(); const [open, setOpen] = useState(false);
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading workspace…</div>;
  if (!user) return null;
  const visible = nav.filter((item) => item.roles.includes(user.role as never));
  const sidebar = <><div className="flex h-16 items-center border-b border-white/10 px-5"><div className="grid size-9 place-items-center rounded-lg bg-[#2b91b8] font-bold text-white">P</div><div className="ml-3"><div className="font-bold tracking-wide">PeopleCore</div><div className="text-[11px] uppercase tracking-[.18em] text-slate-400">HR Management</div></div><button className="ml-auto md:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20}/></button></div><nav className="space-y-1 p-3">{visible.map((item) => { const Icon=item.icon; const active=pathname.startsWith(item.href); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${active ? 'bg-white/12 text-white' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}><Icon size={18}/>{item.label}</Link>; })}</nav></>;
  return <div className="min-h-screen"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-[#11263d] text-white md:block">{sidebar}</aside>{open && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu backdrop"/><aside className="relative h-full w-72 bg-[#11263d] text-white">{sidebar}</aside></div>}<div className="md:pl-64"><header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6"><button className="mr-3 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22}/></button><div className="hidden text-sm text-slate-500 sm:block">Workforce operations</div><div className="ml-auto flex items-center gap-3"><div className="text-right"><div className="text-sm font-semibold">{user.employee?.fullName ?? user.email}</div><div className="text-xs text-slate-500">{user.role.replaceAll('_',' ')}</div></div><ChevronDown size={16} className="text-slate-400"/><button onClick={() => void logout()} className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="Sign out"><LogOut size={17}/></button></div></header><main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main></div></div>;
}
