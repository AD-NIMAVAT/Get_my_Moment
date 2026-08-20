'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MobileTabBar } from '@/components/MobileTabBar';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col mobile-app-container">{children}</main>
          <Footer />
          <MobileTabBar />
        </AdminAuthProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
