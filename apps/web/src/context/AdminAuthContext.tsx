'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, AdminUserItem } from '@/lib/api';

interface AdminAuthContextType {
  admin: AdminUserItem | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gmm_admin_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.adminGetMe();
      setAdmin(data);
    } catch {
      localStorage.removeItem('gmm_admin_token');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const res = await api.adminLogin({ email, password: pass });
    localStorage.setItem('gmm_admin_token', res.access_token);
    setAdmin(res.admin);
    router.push('/admin/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('gmm_admin_token');
    setAdmin(null);
    router.push('/admin/login');
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
