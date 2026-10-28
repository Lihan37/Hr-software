'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Balance { leaveType: { _id: string; code: string; name: string }; available: number }
interface History { rows: { _id: string; leaveType: { code: string } | null; amount: number; reason: string; actor: { email?: string } | null; createdAt: string }[]; total: number; page: number; pageSize: number }
interface Adjustment { employee: string; leaveType: string; year: number; amount: number; reason: string; operationId: string }

export function LeaveAdjustmentDialog({ employee, year, onClose, onSaved }: {
  employee: { _id: string; employeeId: string; fullName: string }; year: number; onClose: () => void; onSaved: () => void;
}) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [type, setType] = useState('');
  const [direction, setDirection] = useState('ADD');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<History | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Adjustment | null>(null);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    const params = new URLSearchParams({ employee: employee._id, year: String(year), page: String(page) });
    Promise.all([api.get<Balance[]>(`/leave/balances?${params}`), api.get<History>(`/leave/balances/adjustments?${params}`)])
      .then(([current, entries]) => { if (active) { setBalances(current); setHistory(entries); setType((value) => value || current[0]?.leaveType._id || ''); } })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load balances and history'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employee._id, year, page, refresh]);
  const selected = balances.find((item) => item.leaveType._id === type);
  const delta = (direction === 'ADD' ? 1 : -1) * Number(amount);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = pending ?? { employee: employee._id, leaveType: type, year, amount: delta, reason: reason.trim(), operationId: `MANUAL:${crypto.randomUUID()}` };
    setPending(input); setBusy(true); setSaveError(''); setSuccess('');
    try {
      await api.post('/leave/balances/adjust', input);
      setPending(null); setAmount(''); setReason(''); setPage(1); reload(); onSaved();
      setSuccess('Adjustment saved.');
    } catch (error) {
      setSaveError((error instanceof Error ? error.message : 'Unable to save adjustment') + ' Retry uses the same reference to prevent duplicate changes.');
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="leave-adjustment-title" className="card mx-auto w-full max-w-3xl p-4 sm:p-6" onKeyDown={(event) => {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')).filter((element) => !element.closest('fieldset:disabled'));
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 id="leave-adjustment-title" className="text-xl font-bold">Leave adjustments</h2><p className="mt-1 text-sm">{employee.fullName} · {employee.employeeId} · {year}</p></div><button autoFocus className="btn-secondary" onClick={onClose} disabled={busy}>Close</button></div>
      <p className="mb-4 text-sm text-slate-600">Add or deduct days from the selected year&apos;s ledger balance. Existing entitlement, leave usage and pending reservations are preserved. Adjustments do not change employment eligibility.</p>
      {loading && <p role="status">Loading balances and adjustment history...</p>}
      {loadError && <p className="mb-4 text-red-700" role="alert">{loadError} <button className="btn-secondary" onClick={reload}>Reload balances</button></p>}
      {success && <p className="mb-4 rounded bg-green-50 p-3 text-green-800" role="status">{success}</p>}
      {saveError && <p className="mb-4 rounded bg-red-50 p-3 text-red-700" role="alert">{saveError}</p>}
      <form onSubmit={save}>
        <fieldset disabled={busy || !!pending || loading || !!loadError} className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold">Leave type</span><select aria-label="Adjustment leave type" className="field" value={type} onChange={(event) => setType(event.target.value)} required><option value="">Select leave type</option>{balances.map((item) => <option key={item.leaveType._id} value={item.leaveType._id}>{item.leaveType.code} - {item.leaveType.name}</option>)}</select></label>
          <label><span className="mb-1 block text-sm font-semibold">Adjustment action</span><select aria-label="Adjustment action" className="field" value={direction} onChange={(event) => setDirection(event.target.value)}><option value="ADD">Add days (+)</option><option value="DEDUCT">Deduct days (-)</option></select></label>
          <label><span className="mb-1 block text-sm font-semibold">Number of days</span><input className="field" type="number" min="0.01" max="10000" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="rounded bg-slate-50 p-3 text-sm"><div>Current ledger balance: <b>{selected?.available ?? '—'}</b></div><div className="mt-2">After adjustment: <b>{selected && amount ? Math.round((selected.available + delta) * 100) / 100 : '—'}</b></div><p className="mt-1 text-xs text-slate-500">Preview only; concurrent ledger entries may change the final balance.</p></div>
          <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Adjustment reason</span><textarea className="field" rows={3} required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </fieldset>
        <div className="my-4 flex justify-end"><button className="btn-primary disabled:opacity-50" disabled={busy || loading || !!loadError || (!pending && (!selected || !amount || reason.trim().length < 5))}>{busy ? 'Saving...' : pending ? 'Retry adjustment' : 'Save adjustment'}</button></div>
      </form>
      <h3 className="mb-2 font-bold">Adjustment history — {year}</h3>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Change</th><th>Reason</th><th>Adjusted by</th></tr></thead><tbody>{history?.rows.map((entry) => <tr key={entry._id}><td>{new Date(entry.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</td><td>{entry.leaveType?.code ?? 'Unavailable'}</td><td>{entry.amount > 0 ? '+' : ''}{entry.amount}</td><td className="min-w-48 max-w-sm !whitespace-normal break-words">{entry.reason}</td><td>{entry.actor?.email ?? 'Unavailable'}</td></tr>)}{!loading && !loadError && !history?.rows.length && <tr><td colSpan={5}>No manual adjustments for this year.</td></tr>}</tbody></table></div>
      {history && history.total > history.pageSize && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>History page {history.page}</span><div className="flex gap-2"><button className="btn-secondary" disabled={loading || busy || history.page <= 1} onClick={() => setPage(history.page - 1)}>Earlier page</button><button className="btn-secondary" disabled={loading || busy || history.page * history.pageSize >= history.total} onClick={() => setPage(history.page + 1)}>Next history page</button></div></div>}
    </section>
  </div>;
}
