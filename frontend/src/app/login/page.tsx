'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CalendarCheck, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';

const schema = z.object({ email: z.email('Enter a valid work email'), password: z.string().min(8, 'Password must be at least 8 characters') });
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter(); const [serverError, setServerError] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: 'employee@demo.hrms.local', password: 'DemoPass123!' } });
  const submit = async (values: FormValues) => { setServerError(''); try { await api.post('/auth/login', values); router.push('/dashboard'); router.refresh(); } catch (error) { setServerError(error instanceof Error ? error.message : 'Unable to sign in'); } };
  return <main className="login-surface grid min-h-[100dvh] lg:grid-cols-[1fr_1fr]">
    <section className="login-hero hidden flex-col justify-between p-10 text-white lg:flex xl:p-16">
      <div className="flex items-center gap-3"><div className="brand-mark">P</div><div><div className="text-xl font-bold tracking-tight">PeopleCore<span className="text-indigo-300">.</span></div><div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.2em] text-indigo-200/65">People & possibilities</div></div></div>
      <div className="my-12 max-w-lg"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-indigo-200"><Sparkles size={14}/>A better way to work, together</div><h1 className="text-[44px] font-bold leading-[1.13] tracking-tight xl:text-[54px]">Great teams.<br/><span className="bg-gradient-to-r from-indigo-200 to-teal-200 bg-clip-text text-transparent">Brighter possibilities.</span></h1><p className="mt-6 max-w-sm text-[15px] leading-7 text-slate-300">Your people, attendance and leave workflows. Thoughtfully connected in one workspace.</p><div className="mt-9 grid gap-3"><div className="login-feature"><Users size={20}/><div><p className="text-sm font-semibold">People at the center</p><p className="mt-0.5 text-xs text-slate-400">One connected employee record</p></div><Check size={15} className="ml-auto"/></div><div className="login-feature"><CalendarCheck size={20}/><div><p className="text-sm font-semibold">Every day, in sync</p><p className="mt-0.5 text-xs text-slate-400">Attendance, time off and approvals</p></div><Check size={15} className="ml-auto"/></div></div></div>
      <div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={15}/>Best Western Plus Runway · Internal workspace</div>
    </section>
    <section className="flex min-w-0 items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-[420px]">
      <div className="mb-8 flex items-center gap-3 lg:hidden"><div className="brand-mark">P</div><div className="text-lg font-bold tracking-tight text-slate-800">PeopleCore<span className="text-indigo-500">.</span></div></div>
      <div className="card p-6 sm:p-9"><div className="mb-6 grid size-12 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500"><LockKeyhole size={23}/></div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-indigo-500">Your workspace awaits</p><h2 className="text-[28px] font-bold tracking-tight text-slate-800">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to make room for a great workday.</p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit(submit)}><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Work email</span><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17}/><input className="field field-with-icon" autoComplete="username" {...register('email')}/></div>{errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>}</label><div><label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-slate-600">Password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17}/><input id="login-password" className="field field-with-icon pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...register('password')}/><button type="button" className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-slate-400 hover:text-indigo-500" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{errors.password && <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span>}</div>{serverError && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}<button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : <>Sign in<ArrowRight size={16}/></>}</button></form>
      <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-5 text-[11px] text-slate-400"><ShieldCheck size={13}/>Organisation access only</div></div>
      <p className="mt-6 text-center text-[11px] leading-5 text-slate-500">Use your organisation account. Change all seeded passwords before any shared deployment.</p>
    </div></section>
  </main>;
}
