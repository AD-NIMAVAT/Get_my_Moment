'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { admin, loading: authLoading, login } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && admin) {
      router.push('/admin/dashboard');
    }
  }, [admin, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Superadmin authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 relative overflow-hidden bg-[#F3F1EC]">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl neu-card relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white mx-auto mb-4 shadow-[4px_4px_10px_#D4D0C7,-4px_-4px_10px_#FFFFFF]">
            <KeyRound className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold text-[#E86A5B] neu-pill mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>SUPER ADMIN CONTROL GATEWAY</span>
          </div>

          <h1 className="text-2xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
            Master Control Authorization
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-1.5 font-normal leading-relaxed">
            Restricted access for Get My Moment platform administrators and system owners.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off" data-lpignore="true" data-form-type="other">
          {/* Prevent aggressive browser autofill */}
          <input type="text" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} autoComplete="off" />
          <input type="password" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} autoComplete="off" />

          <div>
            <label htmlFor="master_admin_email" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">ADMINISTRATOR EMAIL</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E8E8E] flex items-center justify-center z-10">
                <Mail className="w-4 h-4 text-[#E86A5B]" />
              </div>
              <input
                id="master_admin_email"
                name="master_admin_email"
                type="email"
                required
                autoComplete="off"
                data-lpignore="true"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter administrator email"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="master_admin_password" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">MASTER SECURITY PASSWORD</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E8E8E] flex items-center justify-center z-10">
                <Lock className="w-4 h-4 text-[#E86A5B]" />
              </div>
              <input
                id="master_admin_password"
                name="master_admin_password"
                type="password"
                required
                autoComplete="new-password"
                data-lpignore="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 btn-primary py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Authenticating System...' : 'Authorize Superadmin Access'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
