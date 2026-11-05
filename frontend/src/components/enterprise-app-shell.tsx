'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Command,
  LogOut,
  MapPin,
  Menu,
  Search,
  Sparkles,
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
      { label: 'Leave Management', href: '/leave-management', icon: ClipboardCheck, roles: everyRole, aliases: ['team leave balance', 'employee balances', 'HOD leave'] },
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
      { label: 'Organization', href: '/people/organization', icon: Building2, roles: hrRoles, aliases: ['departments', 'designations', 'business units', 'branches', 'cost centers', 'employee levels'] },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Administration', href: '/administration', icon: ShieldCheck, roles: hrRoles, aliases: ['users', 'roles', 'audit'] }, { label: 'Locations', href: '/administration/locations', icon: MapPin, roles: ['SUPER_ADMIN', 'HR_ADMIN'], aliases: ['office', 'work location', 'branch'] }, { label: 'HR lifecycle policy', href: '/administration/hr-policy', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'HR_ADMIN'], aliases: ['probation policy', 'reminders', 'timezone'] }, { label: 'Leave configuration', href: '/administration/leave', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'HR_ADMIN'], aliases: ['leave types', 'leave policy', 'entitlement', 'ch rules'] }],
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
  const [searchOpen, setSearchOpen] = useState(false);
  const mobilePanel = useRef<HTMLElement>(null);
  const searchPanel = useRef<HTMLDivElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  useEffect(() => { if (user && ['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(user.role)) api.get<unknown[]>('/lifecycle/notifications?unread=true&limit=100').then((items) => setNotificationCount(items.length)).catch(() => undefined); }, [user]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setMobileOpen(false); setSearchOpen((value) => !value); } };
    const resize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('keydown', shortcut); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    if (!mobileOpen && !searchOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = searchOpen ? searchPanel.current : mobilePanel.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('input, button:not(:disabled), a[href]') ?? []).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); setSearchOpen(false); }
      if (event.key !== 'Tab') return;
      const controls = focusable(); const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, [mobileOpen, searchOpen]);

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
      setSearchOpen(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="flex items-center gap-3 text-sm font-semibold text-slate-500"><span className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#176b9c]"/>Loading workspace…</div></div>;
  }
  if (!user) return null;

  const sidebar = (compact: boolean) => (
    <>
      <div className={`flex h-20 items-center border-b border-white/8 ${compact ? 'justify-center px-2' : 'px-6'}`}>
        <div className="brand-mark" aria-hidden="true">P</div>
        {!compact && <div className="ml-3 min-w-0"><div className="truncate text-lg font-bold tracking-tight">PeopleCore<span className="text-indigo-300">.</span></div><div className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[.2em] text-slate-400">People & possibilities</div></div>}
        <button className="ml-auto rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button>
      </div>
      <nav className="h-[calc(100dvh-5rem)] overflow-y-auto px-4 py-6 lg:h-[calc(100dvh-10rem)]" aria-label="Primary navigation">
        {visibleGroups.map((group) => <div className="mb-6" key={group.label}>
          {!compact && <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.2em] text-slate-400">{group.label}</div>}
          <div className="space-y-1">{group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return <Link
              key={`${group.label}-${item.href}`}
              href={item.href}
              title={compact ? item.label : undefined}
              aria-label={compact ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              data-active={active}
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${compact ? 'justify-center px-2' : 'gap-3 px-3'}`}
            ><Icon size={18} className={active ? 'shrink-0 text-indigo-200' : 'shrink-0 text-slate-400'}/>{!compact && <span className="truncate">{item.label}</span>}</Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="absolute inset-x-0 bottom-0 hidden h-20 items-center border-t border-white/8 px-4 lg:flex">
        <button className={`flex w-full items-center rounded-xl py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/7 hover:text-white ${compact ? 'justify-center px-2' : 'gap-3 px-3'}`} onClick={() => setCollapsed((value) => !value)} aria-label={compact ? 'Expand navigation' : 'Collapse navigation'}>
          {compact ? <ChevronRight size={18}/> : <><ChevronLeft size={18}/>Collapse workspace</>}
        </button>
      </div>
    </>
  );

  return <div className="workspace">
    <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:p-3">Skip to content</a>
    <aside className={`workspace-sidebar fixed inset-y-0 left-0 z-40 hidden text-white transition-[width] duration-200 lg:block ${collapsed ? 'w-20' : 'w-64'}`}>{sidebar(collapsed)}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation backdrop" tabIndex={-1}/><aside ref={mobilePanel} role="dialog" aria-modal="true" aria-label="Navigation" className="workspace-sidebar relative h-full w-72 max-w-[90vw] text-white shadow-2xl">{sidebar(false)}</aside></div>}
    <div className={`min-w-0 transition-[padding] duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-7">
        <button className="icon-button lg:hidden" onClick={() => { setSearchOpen(false); setMobileOpen(true); }} aria-label="Open navigation"><Menu size={20}/></button>
        <span className="mr-auto text-sm font-bold tracking-tight text-slate-800 md:hidden">PeopleCore<span className="text-indigo-500">.</span></span>
        <form className="relative hidden w-full max-w-md md:block" onSubmit={submitSearch}>
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17}/>
          <input className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/80 pl-9 pr-14 text-[13px] outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your workspace…" aria-label="Search available modules" onKeyDown={(event) => { if (event.key === 'Escape') setSearch(''); }}/>
          <span className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400"><Command size={10}/>K</span>
          {matches.length > 0 && <div className="absolute inset-x-0 top-11 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">{matches.map((item) => <button type="button" key={item.href} onClick={() => { router.push(item.href); setSearch(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"><item.icon size={16} className="text-slate-400"/><span className="font-semibold">{item.label}</span></button>)}</div>}
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button className="icon-button md:hidden" aria-label="Search modules" onClick={() => { setMobileOpen(false); setSearchOpen(true); }}><Search size={18}/></button>
          {['SUPER_ADMIN', 'HR_ADMIN', 'HR'].includes(user.role) && <Link href="/employees/probation-evaluations" className="icon-button relative hidden min-[360px]:grid" title="HR notifications"><Bell size={17}/>{notificationCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{notificationCount > 99 ? '99+' : notificationCount}</span>}</Link>}
          <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block"/>
          <div className="hidden text-right sm:block"><div className="max-w-40 truncate text-xs font-bold">{user.employee?.fullName ?? user.email}</div><div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">{user.role.replaceAll('_', ' ')}</div></div>
          <Link href="/profile" aria-label="My profile" className="grid size-9 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-100 text-sm font-bold text-indigo-600">{(user.employee?.fullName ?? user.email).charAt(0).toUpperCase()}</Link>
          <button onClick={() => void logout()} className="icon-button" title="Sign out" aria-label="Sign out"><LogOut size={16}/></button>
        </div>
      </header>
      <div className="px-4 py-4 sm:px-7">
        <nav className="flex items-center gap-2 overflow-hidden text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-[#176b9c]">Home</Link>
          {breadcrumbs.filter((item) => item.href !== '/dashboard').map((item, index, all) => <span className="flex min-w-0 items-center gap-2" key={item.href}><ChevronRight size={12}/>{item.href === '/people' ? <span className="truncate">{item.label}</span> : <Link href={item.href} aria-current={index === all.length - 1 ? 'page' : undefined} className={`truncate ${index === all.length - 1 ? 'font-semibold text-slate-700' : 'hover:text-[#176b9c]'}`}>{item.label}</Link>}</span>)}
        </nav>
      </div>
      <main id="workspace-content" tabIndex={-1} className="workspace-main mx-auto max-w-[1600px] px-4 pb-8 pt-2 sm:px-7 sm:pb-10">{children}</main>
      <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t border-slate-200/80 py-5 text-[11px] text-slate-400 sm:mx-7"><span>PeopleCore · Best Western Plus Runway</span><span className="inline-flex items-center gap-1.5"><Sparkles size={12}/>Your people. One workspace.</span></footer>
    </div>
    {searchOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/40 p-4 pt-[15vh] backdrop-blur-sm" onClick={() => setSearchOpen(false)}><div ref={searchPanel} role="dialog" aria-modal="true" aria-labelledby="module-search-title" className="card w-full max-w-xl overflow-hidden" onClick={(event) => event.stopPropagation()}><h2 id="module-search-title" className="sr-only">Find a module</h2><form onSubmit={submitSearch} className="flex items-center gap-3 border-b border-slate-100 p-4"><Search size={20} className="shrink-0 text-indigo-500"/><input aria-label="Find a module" className="min-w-0 flex-1 bg-transparent text-base outline-none" placeholder="Where would you like to go?" value={search} onChange={(event) => setSearch(event.target.value)}/><button type="button" aria-label="Close search" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" onClick={() => setSearchOpen(false)}><X size={18}/></button></form><div className="max-h-[50dvh] overflow-y-auto p-2">{(search.trim() ? matches : searchableItems.slice(0, 8)).map((item) => <button key={item.href} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-indigo-50" onClick={() => { router.push(item.href); setSearchOpen(false); setSearch(''); }}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-500"><item.icon size={16}/></span><span className="font-semibold text-slate-700">{item.label}</span><ChevronRight size={14} className="ml-auto text-slate-400"/></button>)}{search.trim() && !matches.length && <p className="p-6 text-center text-sm text-slate-500">No modules found. Try employees, leave or attendance.</p>}</div></div></div>}
  </div>;
}
