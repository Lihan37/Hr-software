'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState { user: User | null; loading: boolean; reload: () => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  const router = useRouter(); const pathname = usePathname();
  const reload = async () => {
    try { setUser(await api.get<User>('/auth/me')); }
    catch { setUser(null); if (pathname !== '/login') router.replace('/login'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  const logout = async () => { await api.logout().catch(() => undefined); setUser(null); router.replace('/login'); };
  return <AuthContext.Provider value={{ user, loading, reload, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; }
