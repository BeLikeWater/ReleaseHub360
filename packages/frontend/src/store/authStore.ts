import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  userType: 'ORG' | 'CUSTOMER';
  customerId?: string;
  customerName?: string;
  /** For CUSTOMER users: mirrors `role` field (customerRole from backend). */
  customerRole?: string;
}

/** Org role permission check. */
function hasOrgPermission(user: User | null, roles: string[]): boolean {
  if (!user || user.userType !== 'ORG') return false;
  return roles.includes(user.role);
}

/** Customer role permission check. */
function hasCustomerPermission(user: User | null, roles: string[]): boolean {
  if (!user || user.userType !== 'CUSTOMER') return false;
  return roles.includes(user.role);
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (accessToken: string) => void;
  hasPermission: (roles: string[]) => boolean;
  hasCustomerPermission: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken) => {
        // Ensure customerRole is set for CUSTOMER users
        const enriched: User =
          user.userType === 'CUSTOMER' ? { ...user, customerRole: user.role } : user;
        set({ user: enriched, accessToken, refreshToken });
      },
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      setAccessToken: (accessToken) => set({ accessToken }),
      hasPermission: (roles) => hasOrgPermission(get().user, roles),
      hasCustomerPermission: (roles) => hasCustomerPermission(get().user, roles),
    }),
    {
      name: 'rh360-auth',
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
