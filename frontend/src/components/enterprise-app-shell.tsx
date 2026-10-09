'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Command,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/auth-provider';
import type { Role } from '@/types';
import { api } from '@/lib/api';

type NavItem = {
  label: string;
  href: string;
  icon: typeof BarChart3;
  roles: readonly Role[];
  aliases?: readonly string[];
};

type NavGroup = { label: string; items: readonly NavItem[] };
const everyRole: readonly Role[] = ['SUPER_ADMIN', 'HR_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
const hrRoles: readonly Role[] = ['SUPER_ADMIN', 'HR_ADMIN', 'HR'];
const peopleRoles: readonly Role[] = ['SUPER_ADMIN', 'HR_ADMIN', 'HR', 'MANAGER'];
const approvalRoles: readonly Role[] = ['SUPER_ADMIN', 'HR_ADMIN', 'HR', 'MANAGER'];

const navigation: readonly NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: everyRole, aliases: ['home', 'summary'] }],
  },
  {
    label: 'Self service',
    items: [
      { label: 'My profile', href: '/profile', icon: UserCircle, roles: everyRole, aliases: ['employee profile'] },
      { label: 'My attendance', href: '/attendance', icon: CalendarCheck, roles: everyRole, aliases: ['clock', 'punch'] },
      { label: 'My leave', href: '/leave', icon: ClipboardCheck, roles: everyRole, aliases: ['time off', 'balance'] },
    ],
  },
  {
    label: 'Manager',
    items: [{ label: 'Approval inbox', href: '/approvals', icon: ShieldCheck, roles: approvalRoles, aliases: ['approve', 'requests'] }],
  },
  {
    label: 'People',
    items: [
      { label: 'Employee master', href: '/employees', icon: Users, roles: peopleRoles, aliases: ['employees', 'directory'] },
      { label: 'Probation evaluations', href: '/employees/probation-evaluations', icon: ClipboardCheck, roles: approvalRoles, aliases: ['probation', 'evaluation', 'confirmation'] },
      { label: 'Organization', href: '/people/organization', icon: Building2, roles: hrRoles, aliases: ['departments', 'designations'] },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Administration', href: '/administration', icon: ShieldCheck, roles: hrRoles, aliases: ['users', 'roles', 'audit'] }, { label: 'HR lifecycle policy', href: '/administration/hr-policy', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'HR_ADMIN'], aliases: ['probation policy', 'reminders', 'timezone'] }],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function titleFromSegment(segment: string) {
  return segment.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function EnterpriseAppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  useEffect(() => { if (user && ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(user.role)) api.get<unknown[]>('/lifecycle/notifications?unread=true&limit=100').then((items) => setNotificationCount(items.length)).catch(() => undefined); }, [user]);

  const visibleGroups = useMemo(() => {
    if (!user) return [];
    return navigation
      .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(user.role)) }))
      .filter((group) => group.items.length > 0);
  }, [user]);

  const searchableItems = visibleGroups.flatMap((group) => group.items);
  const matches = search.trim()
    ? searchableItems.filter((item) => [item.label, ...(item.aliases ?? [])].some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))).slice(0, 6)
    : [];

  const breadcrumbs = pathname.split('/').filter(Boolean).map((segment, index, all) => ({
    label: titleFromSegment(segment),
    href: `/${all.slice(0, index + 1).join('/')}`,
  }));

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (matches[0]) {
      router.push(matches[0].href);
      setSearch('');
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="flex items-center gap-3 text-sm font-semibold text-slate-500"><span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#176b9c]"/>Loading workspace…</div></div>;
  }
  if (!user) return null;

  const sidebar = (
    <>
      <div className={`flex h-16 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#2b91b8] font-bold text-white">P</div>
        {!collapsed && <div className="ml-3 min-w-0"><div className="truncate font-bold tracking-wide">PeopleCore</div><div className="truncate text-[10px] uppercase tracking-[.18em] text-slate-400">HR Management</div></div>}
        <button className="ml-auto rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button>
      </div>
      <nav className="h-[calc(100vh-8rem)] overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        {visibleGroups.map((group) => <div className="mb-5" key={group.label}>
          {!collapsed && <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">{group.label}</div>}
          <div className="space-y-1">{group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return <Link
              key={`${group.label}-${item.href}`}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex min-h-10 items-center rounded-md text-sm font-semibold transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active ? 'bg-white/12 text-white shadow-sm' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}
            ><Icon size={18}/>{!collapsed && <span className="truncate">{item.label}</span>}</Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="absolute inset-x-0 bottom-0 hidden h-16 items-center border-t border-white/10 px-3 md:flex">
        <button className={`flex w-full items-center rounded-md py-2 text-sm font-semibold text-slate-300 hover:bg-white/7 hover:text-white ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`} onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          {collapsed ? <ChevronRight size={18}/> : <><ChevronLeft size={18}/>Collapse</>}
        </button>
      </div>
    </>
  );

  return <div className="min-h-screen bg-[#f4f6f8]">
    <aside className={`fixed inset-y-0 left-0 z-40 hidden bg-[#11263d] text-white shadow-xl transition-[width] duration-200 md:block ${collapsed ? 'w-20' : 'w-64'}`}>{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-slate-950/45" onClick={() => setMobileOpen(false)} aria-label="Close navigation backdrop"/><aside className="relative h-full w-72 bg-[#11263d] text-white shadow-2xl">{sidebar}</aside></div>}
    <div className={`transition-[padding] duration-200 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button>
        <form className="relative hidden w-full max-w-md sm:block" onSubmit={submitSearch}>
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17}/>
          <input className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm outline-none transition focus:border-[#176b9c] focus:bg-white focus:ring-2 focus:ring-sky-100" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search available modules" aria-label="Search available modules"/>
          <span className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400"><Command size={10}/>K</span>
          {matches.length > 0 && <div className="absolute inset-x-0 top-11 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">{matches.map((item) => <button type="button" key={item.href} onClick={() => { router.push(item.href); setSearch(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"><item.icon size={16} className="text-slate-400"/><span className="font-semibold">{item.label}</span></button>)}</div>}
        </form>
        <div className="ml-auto flex items-center gap-3">
          {['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(user.role) && <Link href="/employees/probation-evaluations" className="relative grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="HR notifications"><Bell size={17}/>{notificationCount > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{notificationCount > 99 ? '99+' : notificationCount}</span>}</Link>}
          <div className="hidden text-right sm:block"><div className="max-w-52 truncate text-sm font-semibold">{user.employee?.fullName ?? user.email}</div><div className="text-xs text-slate-500">{user.role.replaceAll('_', ' ')}</div></div>
          <div className="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-bold text-[#176b9c]">{(user.employee?.fullName ?? user.email).charAt(0).toUpperCase()}</div>
          <ChevronDown size={15} className="hidden text-slate-400 sm:block"/>
          <button onClick={() => void logout()} className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="Sign out" aria-label="Sign out"><LogOut size={17}/></button>
        </div>
      </header>
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
        <nav className="flex items-center gap-2 overflow-hidden text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-[#176b9c]">Home</Link>
          {breadcrumbs.filter((item) => item.href !== '/dashboard').map((item, index, all) => <span className="flex min-w-0 items-center gap-2" key={item.href}><ChevronRight size={12}/><Link href={item.href} className={`truncate ${index === all.length - 1 ? 'font-semibold text-slate-700' : 'hover:text-[#176b9c]'}`}>{item.label}</Link></span>)}
        </nav>
      </div>
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-7">{children}</main>
    </div>
  </div>;
}
