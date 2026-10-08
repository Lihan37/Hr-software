import { EnterpriseAppShell } from '@/components/enterprise-app-shell';
import { AuthProvider } from '@/features/auth/auth-provider';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) { return <AuthProvider><EnterpriseAppShell>{children}</EnterpriseAppShell></AuthProvider>; }
