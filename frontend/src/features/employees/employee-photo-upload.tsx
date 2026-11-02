'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface EmployeePhoto { url: string; provider?: string; storageKey?: string }
const maxPhotoBytes = 1000 * 1000;

export function EmployeePhotoUpload({ employeeId, currentPhoto, onUploaded }: {
  employeeId: string; currentPhoto?: EmployeePhoto; onUploaded: (photo: EmployeePhoto) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValid(false);
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !valid || busy) return;
    setBusy(true); setError(''); setSuccess('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const form = new FormData(); form.append('photo', file);
      const photo = await api.upload<EmployeePhoto>(`/employees/${employeeId}/photo`, form, { signal: controller.signal });
      onUploaded(photo); setFile(null);
      if (input.current) input.current.value = '';
      setSuccess('Photo saved to Employee Profile. The ID card now uses this photo.');
    } catch (reason) {
      setError(controller.signal.aborted ? 'Upload timed out. Refresh the profile to check whether the photo was saved before retrying.' : reason instanceof Error ? reason.message : 'Unable to upload photo. Please retry.');
    } finally { clearTimeout(timeout); setBusy(false); }
  };
  return <section className="card mb-6 p-5" aria-label="Employee photo upload">
    <h2 className="font-bold">Employee photo</h2>
    <p className="mt-1 text-sm text-slate-600">Upload or replace the profile photo used on this employee&apos;s ID card. WebP only, maximum 1000 KB. Use a clear portrait with the face centered.</p>
    <form className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center" onSubmit={upload}>
      {preview ? <img key={preview} src={preview} alt="Selected photo preview" className="size-24 shrink-0 rounded-full object-cover" onLoad={() => setValid(true)} onError={() => { setValid(false); setError('This file cannot be opened as an image. Choose a valid WebP photo.'); }} /> : currentPhoto?.url ? <img key={currentPhoto.url} src={currentPhoto.url} alt="Current employee photo" className="size-24 shrink-0 rounded-full object-cover" /> : <div className="grid size-24 shrink-0 place-items-center rounded-full bg-slate-100 text-center text-xs text-slate-500">No photo</div>}
      <label className="min-w-0 flex-1"><span className="mb-1 block text-sm font-semibold">Choose employee photo</span><input ref={input} type="file" accept="image/webp,.webp" className="field max-w-full" disabled={busy} onChange={(event) => {
        const selected = event.target.files?.[0]; setError(''); setSuccess(''); setFile(null); setValid(false);
        if (!selected) return;
        if (selected.type !== 'image/webp') { setError('Choose a WebP image.'); event.target.value = ''; return; }
        if (selected.size > maxPhotoBytes) { setError('Photo must be 1000 KB or smaller.'); event.target.value = ''; return; }
        setFile(selected);
      }} /></label>
      <button className="btn-primary disabled:opacity-50" disabled={!file || !valid || busy}>{busy ? 'Uploading photo...' : currentPhoto?.url ? 'Replace photo' : 'Upload photo'}</button>
    </form>
    {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
    {success && <p className="mt-3 text-sm text-green-800" role="status">{success}</p>}
  </section>;
}
