import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface CustomerRoleGuardProps {
  customerRoles: string[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * B3-02: CustomerRoleGuard — Müşteri kullanıcıları için rol bazlı erişim kontrolü.
 * Müşteri userType + customerRole eşleşmezse /customer-dashboard'a redirect eder.
 */
export default function CustomerRoleGuard({ customerRoles, children, redirectTo = '/customer-dashboard' }: CustomerRoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.userType !== 'CUSTOMER' || !customerRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
