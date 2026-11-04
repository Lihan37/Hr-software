'use client';

import Link from 'next/link';
import { Download, Printer } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/features/auth/auth-provider';
import { IdCardRenderer, type IdCardEmployee } from '@/features/id-card/id-card-renderer';
import { employeeIdCardTemplate } from '@/features/id-card/id-card-template';
import { api } from '@/lib/api';
import { EmployeePhotoUpload } from '@/features/employees/employee-photo-upload';

const allowedRoles = ['SUPER_ADMIN', 'HR_ADMIN', 'HR'];

export default function EmployeeIdCardPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [employee, setEmployee] = useState<IdCardEmployee | null>(null);
  const [error, setError] = useState('');
  const [printError, setPrintError] = useState('');
  const [printing, setPrinting] = useState(false);
  const templateReady = employeeIdCardTemplate.status === 'READY';

  useEffect(() => {
    if (!loading && user && allowedRoles.includes(user.role)) {
      let active = true;
      setEmployee(null); setError(''); setPrintError('');
      api.get<IdCardEmployee>(`/employees/${id}/id-card-data`).then((record) => { if (active) setEmployee(record); }).catch((reason: Error) => { if (active) setError(reason.message); });
      return () => { active = false; };
    }
  }, [id, loading, user]);

  if (loading) return <div className="card h-64 animate-pulse bg-slate-100"/>;
  if (!user || !allowedRoles.includes(user.role)) return <section className="card p-8 text-center"><h1 className="text-xl font-bold">Access denied</h1><p className="mt-2 text-sm text-slate-600">Only authorized HR and Admin users can generate employee ID cards.</p></section>;
  if (error) return <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>;
  if (!employee) return <div className="card h-64 animate-pulse bg-slate-100"/>;

  const printCard = async () => {
    if (!templateReady || printing) return;
    setPrinting(true); setPrintError('');
    try {
      const root = document.getElementById('employee-id-card-print-root');
      if (!root) throw new Error('Print layout is not ready. Please retry.');
      await document.fonts.ready;
      await Promise.all(Array.from(root.querySelectorAll('img')).map((img) => img.decode()));
      if (root.querySelector('[data-card-photo-missing]')) throw new Error('Upload a working employee profile photo before printing this card.');
      if (root.querySelector('[data-card-overflow]')) throw new Error('An employee field is too long for the card. Please review the preview and template field configuration.');
      window.print();
    } catch (reason) {
      setPrintError(reason instanceof Error ? reason.message : 'Unable to prepare the card images for printing.');
    } finally { setPrinting(false); }
  };
  const details = [
    ['Employee', employee.fullName], ['Employee ID', employee.employeeId],
    ['Designation', employee.employment.designation?.name], ['Department', employee.employment.department?.name],
    ['Blood group', employee.personal?.bloodGroup],
    ['Joining date', employee.employment.joiningDate ? new Date(employee.employment.joiningDate).toLocaleDateString('en-GB') : undefined],
    ['Photo', employee.profilePhoto?.url ? 'Available' : 'Missing'],
  ];

  return <>
    <PageHeader title="Employee ID card" description={`${employee.fullName} · ${employee.employeeId}`} action={<Link href={`/employees/${id}`} className="btn-secondary">Back to profile</Link>}/>
    {printError && <div role="alert" className="mb-4 rounded bg-red-50 p-4 text-red-700">{printError}</div>}
    {templateReady && <p className="mb-4 text-sm text-slate-600">Official Runway front/back artwork. Save as PDF opens the browser print dialog: choose Save as PDF, use 100% / Actual size, and disable headers and footers. Each side is a separate card-size page; align duplex orientation with your printer.</p>}
    {templateReady && !employee.profilePhoto?.url && <p role="alert" className="mb-4 rounded bg-amber-50 p-4 text-amber-900">Employee photo is missing. Add a profile photo before printing or saving the card.</p>}
    <EmployeePhotoUpload key={employee._id} employeeId={employee._id} currentPhoto={employee.profilePhoto} onUploaded={(photo) => { setEmployee((current) => current?._id === employee._id ? { ...current, profilePhoto: photo } : current); setPrintError(''); }} />
    {!templateReady && <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-950"><h2 className="font-bold">Official ID card template required</h2><p className="mt-2 text-sm leading-6">The generation workflow is ready, but preview and PDF/print output remain disabled until the official front/back artwork, exact card dimensions, typography and field positions are supplied. No substitute design has been created.</p></section>}
    <section className="card mb-6 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Live Employee Master data</h2><p className="mt-1 text-sm text-slate-500">The card is regenerated from the latest employee record every time this page opens.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={!templateReady || printing || !employee.profilePhoto?.url} onClick={printCard}><Download size={16}/>Save as PDF</button><button type="button" className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={!templateReady || printing || !employee.profilePhoto?.url} onClick={printCard}><Printer size={16}/>{printing ? 'Preparing…' : 'Print'}</button></div></div>
      <dl className="mt-5 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div key={label} className="border-b border-slate-100 py-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium">{value || '—'}</dd></div>)}</dl>
    </section>
    {templateReady && <section className="card overflow-auto p-6"><h2 className="mb-5 font-bold">Print preview</h2><IdCardRenderer employee={employee} template={employeeIdCardTemplate}/></section>}
    {templateReady && createPortal(<div id="employee-id-card-print-root" aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0 }}><IdCardRenderer employee={employee} template={employeeIdCardTemplate} printLayout /></div>, document.body)}
    {templateReady && employeeIdCardTemplate.widthMm && employeeIdCardTemplate.heightMm && <style>{`@media print { html, body { margin: 0 !important; padding: 0 !important; background: white !important; } body > *:not(#employee-id-card-print-root) { display: none !important; } #employee-id-card-print-root { display: block !important; position: static !important; margin: 0 !important; padding: 0 !important; } #employee-id-card-print-root .id-card-side { display: block; break-inside: avoid; break-after: page; box-shadow: none !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; } #employee-id-card-print-root .id-card-side:last-child { break-after: auto; } } @page { size: ${employeeIdCardTemplate.widthMm}mm ${employeeIdCardTemplate.heightMm}mm; margin: 0; }`}</style>}
  </>;
}
