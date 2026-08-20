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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-16 relative overflow-hidden bg-gradient-to-br from-[#0B081E] via-[#0E122C] to-[#180C26] text-white">
      {/* Lumina Glowing Ambient Orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-600/25 rounded-full blur-[140px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none translate-x-1/2 translate-y-1/2" />
      <div className="fixed top-1/2 right-1/3 w-80 h-80 bg-pink-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <KeyRound className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>SUPER ADMIN CONTROL GATEWAY</span>
          </div>

          <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Master Control Authorization
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 font-normal leading-relaxed">
            Restricted access for Get My Moment platform administrators and system owners.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label htmlFor="master_admin_email" className="block text-xs font-bold text-neutral-300 mb-1.5">
              ADMINISTRATOR EMAIL
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="master_admin_email"
                name="master_admin_email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@getmymoment.com"
                className="w-full bg-white/[0.06] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="master_admin_password" className="block text-xs font-bold text-neutral-300 mb-1.5">
              MASTER SECURITY PASSWORD
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="master_admin_password"
                name="master_admin_password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white/[0.06] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-purple-500 font-mono transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-purple-600/30 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{loading ? 'Authenticating System...' : 'Authorize Superadmin Access'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
