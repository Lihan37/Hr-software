import type { ApiEnvelope } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiClientError extends Error { constructor(message: string, public status: number) { super(message); } }

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init.headers }
  });
  if (response.status === 401 && retry && path !== '/auth/login') {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) return request<T>(path, init, false);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok) throw new ApiClientError(body.error?.message ?? 'Request failed', response.status);
  return body.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' })
};
