'use client';

import React, { createContext, useContext } from 'react';
import { authClient } from '@/lib/auth-client';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  isAdmin: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const logout = async () => {
    await authClient.signOut();
  };

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        username: (session.user as any).username ?? session.user.name,
        isAdmin: (session.user as any).isAdmin ?? false,
      }
    : null;

  return (
    <AuthContext.Provider value={{ user, loading: isPending, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
