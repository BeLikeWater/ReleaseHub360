import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * B3-01: RoleGuard — Kurum kullanıcıları için rol bazlı erişim kontrolü.
 * Kullanıcı rolü belirtilen rollerden birine sahip değilse redirect eder veya null render eder.
 */
export default function RoleGuard({ roles, children, redirectTo = '/' }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.userType !== 'ORG' || !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
