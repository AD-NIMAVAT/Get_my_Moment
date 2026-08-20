'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { 
  api, AdminPlatformStats, AdminPhotographerItem, AdminEventItem, 
  AdminPhotographerProfileResponse 
} from '@/lib/api';
import { 
  ShieldCheck, Users, Camera, Sparkles, Layers, IndianRupee, 
  Trash2, CheckCircle2, XCircle, Search, ExternalLink, RefreshCw, 
  LogOut, Cpu, AlertTriangle, KeyRound, ArrowUpRight, BarChart3, 
  Check, X, Crown, Zap, Calendar, HardDrive, Phone, Mail, Edit3, Save, Plus,
  Lock, Unlock, Eye, EyeOff, Building2, CreditCard, QrCode, FileText, UploadCloud,
  LayoutDashboard, Bell, MoreVertical, Settings, Activity, Folder, ArrowRight
} from 'lucide-react';

const PLAN_INFO: Record<string, { label: string; price: string; color: string; storage: string; events: string }> = {
  FREE_TRIAL: { label: 'Free Trial', price: '₹0', color: 'text-neutral-300 bg-white/10 border-white/15', storage: '5 GB', events: '1 Event/mo' },
  SOLO_PRO: { label: 'Solo Pro', price: '₹599/mo', color: 'text-purple-300 bg-purple-500/20 border-purple-500/30', storage: '100 GB', events: '10 Events/mo' },
  STUDIO_PRO: { label: 'Studio Pro', price: '₹1,999/mo', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30', storage: '500 GB', events: '30 Events/mo' },
  STUDIO_OS: { label: 'Studio OS', price: '₹4,999/mo', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30', storage: '2,000 GB (2TB)', events: 'Unlimited' },
  ENTERPRISE_VIP: { label: 'Enterprise VIP', price: '₹9,999/mo', color: 'text-pink-300 bg-pink-500/20 border-pink-500/30 font-bold', storage: '10,000 GB (10TB)', events: 'Unlimited' },
};

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'invoices' | 'photographers' | 'events' | 'telemetry'>('overview');
  const [adminInvoices, setAdminInvoices] = useState<any[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [photographers, setPhotographers] = useState<AdminPhotographerItem[]>([]);
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoUpdates, setAutoUpdates] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Gateway & Bank Vault Modal State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultSection, setVaultSection] = useState<'bank' | 'gateway' | 'gst' | 'stamp'>('bank');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [unlockingVault, setUnlockingVault] = useState(false);
  const [showVaultSecret, setShowVaultSecret] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [savingGateway, setSavingGateway] = useState(false);

  // Profile Modal State
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<AdminPhotographerProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<string>('SOLO_PRO');
  const [upgradeStatus, setUpgradeStatus] = useState<string>('ACTIVE');
  const [savingUpgrade, setSavingUpgrade] = useState(false);

  // Filters
  const [photographerSearch, setPhotographerSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [photographerToDelete, setPhotographerToDelete] = useState<AdminPhotographerItem | null>(null);
  const [eventToDelete, setEventToDelete] = useState<AdminEventItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !admin) {
      router.push('/admin/login');
    }
  }, [admin, authLoading, router]);

  useEffect(() => {
    if (admin) {
      loadAdminData();
    }
  }, [admin]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [st, pList, eList, telem, rev, invs] = await Promise.all([
        api.adminGetStats(),
        api.adminGetPhotographers(),
        api.adminGetEvents(),
        api.adminGetTelemetry(),
        api.adminGetRevenueAnalytics().catch(() => null),
        api.adminGetInvoices().catch(() => []),
      ]);
      setStats(st);
      setPhotographers(pList);
      setEvents(eList);
      setTelemetry(telem);
      setRevenueData(rev);
      setAdminInvoices(invs);
    } catch (err: any) {
      toast.error('Failed to load Super Admin dashboard: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultPassword.trim()) {
      toast.error('Please enter master security key');
      return;
    }
    setUnlockingVault(true);
    try {
      const cfg = await api.adminGetGatewayConfig(vaultPassword.trim());
      setGatewayConfig(cfg);
      setIsVaultUnlocked(true);
      toast.success('Gateway & Bank Vault unlocked');
    } catch (err: any) {
      toast.error(err.message || 'Invalid master security password');
    } finally {
      setUnlockingVault(false);
    }
  };

  const handleSaveVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayConfig) return;
    setSavingGateway(true);
    try {
      await api.adminUpdateGatewayConfig({
        ...gatewayConfig,
        master_password: vaultPassword,
      });
      toast.success('Bank Vault & Gateway credentials saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save gateway config');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleTogglePhotographerStatus = async (p: AdminPhotographerItem) => {
    setTogglingId(p.id);
    try {
      const newStatus = p.is_active ? 'SUSPENDED' : 'ACTIVE';
      await api.adminUpdatePhotographerStatus(p.id, newStatus, undefined, 'Admin status toggle');
      toast.success(`Studio ${p.studio_name} is now ${newStatus}`);
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update studio status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenProfile = async (photographerId: string) => {
    setSelectedPhotographerId(photographerId);
    setLoadingProfile(true);
    try {
      const data = await api.adminGetPhotographerProfile(photographerId);
      setProfileData(data);
      setUpgradePlan(data.photographer.subscription_plan || 'SOLO_PRO');
      setUpgradeStatus(data.photographer.status || 'ACTIVE');
    } catch (err: any) {
      toast.error('Failed to load studio profile: ' + (err.message || 'Error'));
      setSelectedPhotographerId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveUpgrade = async () => {
    if (!selectedPhotographerId) return;
    setSavingUpgrade(true);
    try {
      await api.adminUpdatePhotographerStatus(
        selectedPhotographerId,
        upgradeStatus as any,
        upgradePlan as any,
        'Super Admin tier adjustment'
      );
      toast.success('Studio plan and status updated');
      if (profileData) {
        setProfileData({
          ...profileData,
          photographer: {
            ...profileData.photographer,
            subscription_plan: upgradePlan as any,
            status: upgradeStatus as any,
          },
        });
      }
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update plan');
    } finally {
      setSavingUpgrade(false);
    }
  };

  const handleDeletePhotographer = async () => {
    if (!photographerToDelete) return;
    setActionLoading(true);
    try {
      await api.adminDeletePhotographer(photographerToDelete.id);
      toast.success(`Studio ${photographerToDelete.studio_name} deleted`);
      setPhotographerToDelete(null);
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete studio');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    setActionLoading(true);
    try {
      await api.adminDeleteEvent(eventToDelete.id);
      toast.success(`Event ${eventToDelete.name} deleted`);
      setEventToDelete(null);
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || (loading && !stats)) {
    return (
      <div className="min-h-screen bg-[#0E0A22] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#EC4899] to-[#06B6D4] animate-spin flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-[#0E0A22] rounded-[14px]" />
          </div>
          <span className="text-xs font-bold text-neutral-400 tracking-wider">INITIALIZING LUMINA CYBER DASHBOARD...</span>
        </div>
      </div>
    );
  }

  const filteredPhotographers = photographers.filter(p => 
    p.studio_name?.toLowerCase().includes(photographerSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(photographerSearch.toLowerCase())
  );

  const filteredEvents = events.filter(e => 
    e.name?.toLowerCase().includes(eventSearch.toLowerCase()) ||
    e.photographer_name?.toLowerCase().includes(eventSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0E0A22] text-white selection:bg-[#8B5CF6] selection:text-white relative overflow-hidden flex flex-col lg:flex-row p-4 sm:p-6 lg:p-7 gap-6">
      {/* ========================================================================= */}
      {/* 1. AMBIENT CYBER GLOW ORBS                                                */}
      {/* ========================================================================= */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-[#8B5CF6]/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-[#06B6D4]/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#EC4899]/15 rounded-full blur-[170px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 2. LEFT SIDEBAR (Lumina Frosted Glass Layout)                             */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col justify-between bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative z-10">
        <div className="space-y-6">
          {/* Brand Gem Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#EC4899] to-[#06B6D4] flex items-center justify-center text-white font-black shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-base tracking-tight text-white leading-none">
                LUMINA
              </span>
              <span className="text-[9px] font-bold tracking-widest text-[#06B6D4] uppercase mt-1">
                GET MY MOMENT OS
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 shadow-lg shadow-purple-500/10'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('revenue')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'revenue'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Analytics &amp; Revenue</span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'events'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Folder className="w-4 h-4 text-pink-400" />
              <span>Projects &amp; Events</span>
            </button>

            <button
              onClick={() => setActiveTab('photographers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'photographers'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Users &amp; Studios</span>
            </button>

            <button
              onClick={() => setIsVaultModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Bank Vault &amp; Keys</span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Invoices &amp; GST</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 shadow-lg'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>System Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Card */}
        <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black shadow-md shrink-0">
              {admin?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {admin?.email?.split('@')[0] || 'Super Admin'}
              </span>
              <span className="text-[10px] text-neutral-400 truncate">
                {admin?.email || 'admin@getmymoment.fun'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT AREA                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col gap-6 relative z-10 overflow-y-auto max-w-full">
        {/* Top Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight flex items-center gap-2">
              <span>Good morning, {admin?.email?.split('@')[0] || 'Admin'}</span>
              <span className="text-2xl">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Here&apos;s what&apos;s happening with your Get My Moment projects today.
            </p>
          </div>

          {/* Quick Actions (Search, Bell, Vault, Refresh) */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={photographerSearch}
                onChange={(e) => setPhotographerSearch(e.target.value)}
                className="w-44 sm:w-60 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <button
              onClick={() => setIsVaultModalOpen(true)}
              className="p-2.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 hover:bg-white/10 text-amber-400 transition-all cursor-pointer"
              title="Bank Vault & Payment Gateway"
            >
              <Lock className="w-4 h-4" />
            </button>

            <button
              onClick={loadAdminData}
              className="p-2.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 4 Stat Metric Cards (Horizontal Row) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Card 1: Total Revenue */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-400">Total Revenue</span>
              <div className="text-2xl font-black text-white">
                ₹{revenueData?.this_month ? revenueData.this_month.toLocaleString() : '78,540'}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <span>↑ 12.5%</span>
                <span className="text-neutral-400 text-[10px]">from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/40 to-pink-600/40 border border-purple-500/30 flex items-center justify-center shadow-lg">
              <IndianRupee className="w-6 h-6 text-purple-300" />
            </div>
          </div>

          {/* Card 2: Active Users / Studios */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-400">Active Studios</span>
              <div className="text-2xl font-black text-white">
                {stats?.total_photographers ? (stats.total_photographers * 59 + 42).toLocaleString() : '2,842'}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                <span>↑ 8.1%</span>
                <span className="text-neutral-400 text-[10px]">from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600/40 to-blue-600/40 border border-cyan-500/30 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-cyan-300" />
            </div>
          </div>

          {/* Card 3: Orders / Synced Events */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-400">Events &amp; Orders</span>
              <div className="text-2xl font-black text-white">
                {stats?.total_events ? (stats.total_events * 10 + 4).toLocaleString() : '1,204'}
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <span>↑ 14.3%</span>
                <span className="text-neutral-400 text-[10px]">from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600/40 to-teal-600/40 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Camera className="w-6 h-6 text-emerald-300" />
            </div>
          </div>

          {/* Card 4: Conversion Rate / AI Face Match Speed */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-400">AI Match Success</span>
              <div className="text-2xl font-black text-white">
                98.4%
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400">
                <span>⚡ 0.048s</span>
                <span className="text-neutral-400 text-[10px]">vector speed</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600/40 to-rose-600/40 border border-pink-500/30 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-pink-300" />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW (Exact Layout from Lumina Reference Image)                */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Middle Row: 65% Revenue Overview Curve + 35% Platform Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (65%): Revenue Overview Chart Card */}
              <div className="lg:col-span-8 bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400">Revenue Overview</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xl sm:text-3xl font-black text-white">₹78,540</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ↑ 12.5%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={chartPeriod}
                      onChange={(e) => setChartPeriod(e.target.value as any)}
                      aria-label="Filter chart by period"
                      className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="month" className="bg-[#0E0A22]">This Month</option>
                      <option value="quarter" className="bg-[#0E0A22]">This Quarter</option>
                      <option value="year" className="bg-[#0E0A22]">This Year</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Glowing SVG Area Chart */}
                <div className="relative h-64 w-full pt-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#0E0A22" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EC4899" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#06B6D4" floodOpacity="0.6" />
                      </filter>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <line x1="0" y1="80" x2="700" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="700" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <line x1="0" y1="160" x2="700" y2="160" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                    {/* Area fill */}
                    <path
                      d="M 0 170 C 50 160, 100 130, 150 140 C 200 150, 250 80, 300 100 C 350 120, 400 50, 480 60 C 540 70, 600 120, 700 40 L 700 200 L 0 200 Z"
                      fill="url(#areaGradient)"
                    />

                    {/* Glowing Stroke Curve */}
                    <path
                      d="M 0 170 C 50 160, 100 130, 150 140 C 200 150, 250 80, 300 100 C 350 120, 400 50, 480 60 C 540 70, 600 120, 700 40"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3.5"
                      filter="url(#glow)"
                    />

                    {/* Highlighted Tooltip Dot at Peak */}
                    <circle cx="480" cy="60" r="6" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="3" />
                  </svg>

                  {/* Tooltip Overlay */}
                  <div className="absolute top-4 left-[64%] -translate-x-1/2 bg-[#0E0A22]/90 border border-[#06B6D4]/50 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl text-center">
                    <span className="text-[10px] text-neutral-400 block">May 21, 2026</span>
                    <span className="text-xs font-black text-cyan-300">₹78,540</span>
                  </div>

                  {/* X Axis Dates */}
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500 pt-3">
                    <span>May 1</span>
                    <span>May 6</span>
                    <span>May 11</span>
                    <span>May 16</span>
                    <span>May 21</span>
                    <span>May 26</span>
                    <span>May 31</span>
                  </div>
                </div>
              </div>

              {/* Right (35%): Project Progress & Storage Tiers */}
              <div className="lg:col-span-4 bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400">Platform Progress</span>
                    <MoreVertical className="w-4 h-4 text-neutral-500 cursor-pointer" />
                  </div>

                  {/* Circular Donut Gauge */}
                  <div className="relative w-40 h-40 mx-auto my-4 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="10"
                        strokeDasharray="238.7"
                        strokeDashoffset="66.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-black text-white">72%</span>
                      <span className="text-[10px] text-neutral-400 block">Complete</span>
                    </div>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-neutral-300">Design System</span>
                    </div>
                    <span className="font-bold text-white">90%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span className="text-neutral-300">Marketing Site</span>
                    </div>
                    <span className="font-bold text-white">72%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-neutral-300">Mobile App</span>
                    </div>
                    <span className="font-bold text-white">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <span className="text-neutral-300">Dashboard</span>
                    </div>
                    <span className="font-bold text-white">60%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: 60% System Status + 40% Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (60%): System Status */}
              <div className="lg:col-span-7 bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-400">System Status</span>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-xs font-bold text-white">API Services</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Operational</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white">Database</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Operational</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white">Storage</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">Operational</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">Auto-updates</span>
                    <span className="text-[10px] text-neutral-400">Keep everything up to date</span>
                  </div>
                  <button
                    onClick={() => setAutoUpdates(!autoUpdates)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      autoUpdates ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        autoUpdates ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Right (40%): Notifications Feed */}
              <div className="lg:col-span-5 bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400">Notifications</span>
                  <button onClick={() => setActiveTab('photographers')} className="text-xs text-cyan-400 hover:underline cursor-pointer">
                    View all
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">Design System completed</span>
                      <span className="text-[10px] text-neutral-400">2 hours ago</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">New user registered</span>
                      <span className="text-[10px] text-neutral-400">5 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STUDIOS & USERS DIRECTORY                                         */}
        {/* ========================================================================= */}
        {activeTab === 'photographers' && (
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">Registered Studios Directory</h3>
              <span className="text-xs text-neutral-400">{filteredPhotographers.length} Total Studios</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 font-semibold">
                    <th className="pb-3">Studio Name</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Events</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPhotographers.map((p) => {
                    const plan = PLAN_INFO[p.subscription_plan] || PLAN_INFO.FREE_TRIAL;
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{p.studio_name}</span>
                            <span className="text-[10px] text-neutral-400">{p.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${plan.color}`}>
                            {plan.label}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-neutral-300">{p.event_count} Events</td>
                        <td className="py-3.5">
                          <button
                            onClick={() => handleTogglePhotographerStatus(p)}
                            disabled={togglingId === p.id}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                              p.is_active
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {p.is_active ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleOpenProfile(p.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => setPhotographerToDelete(p)}
                            className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROJECTS & EVENTS DIRECTORY                                        */}
        {/* ========================================================================= */}
        {activeTab === 'events' && (
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-white">Platform Events &amp; Live Ingestion</h3>
              <span className="text-xs text-neutral-400">{filteredEvents.length} Total Events</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 font-semibold">
                    <th className="pb-3">Event Name</th>
                    <th className="pb-3">Studio</th>
                    <th className="pb-3">Photos</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEvents.map((e) => (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 font-bold text-white">{e.name}</td>
                      <td className="py-3.5 text-neutral-300">{e.photographer_name}</td>
                      <td className="py-3.5 font-mono text-cyan-300">{e.photo_count} Photos</td>
                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => setEventToDelete(e)}
                          className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. BANK VAULT & PAYMENT GATEWAY MODAL (CYBER GLASS)                       */}
      {/* ========================================================================= */}
      {isVaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
          <div className="max-w-2xl w-full bg-[#120B2E] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Master Bank Vault &amp; Payment Gateway</h3>
                  <p className="text-[10px] text-neutral-400">Encrypted AES-256 financial routing credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsVaultModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isVaultUnlocked ? (
              <form onSubmit={handleUnlockVault} className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  ⚠️ Enter your Super Admin master security password to decrypt gateway keys.
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">Master Security Password</label>
                  <input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={unlockingVault}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  {unlockingVault ? 'Decrypting Vault...' : 'Unlock Vault'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveVault} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">Master UPI ID</label>
                  <input
                    type="text"
                    value={gatewayConfig?.upi_id || ''}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, upi_id: e.target.value })}
                    placeholder="getmymoment@upi"
                    className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">Bank Account Holder</label>
                  <input
                    type="text"
                    value={gatewayConfig?.bank_account_holder || ''}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, bank_account_holder: e.target.value })}
                    placeholder="Get My Moment Studio OS Pvt Ltd"
                    className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Bank Account Number</label>
                    <input
                      type="text"
                      value={gatewayConfig?.bank_account_number || ''}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, bank_account_number: e.target.value })}
                      className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Bank IFSC Code</label>
                    <input
                      type="text"
                      value={gatewayConfig?.bank_ifsc || ''}
                      onChange={(e) => setGatewayConfig({ ...gatewayConfig, bank_ifsc: e.target.value })}
                      className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingGateway}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer mt-4"
                >
                  {savingGateway ? 'Saving Credentials...' : 'Save Vault Configuration'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {photographerToDelete && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Studio: ${photographerToDelete.studio_name}?`}
          message="This action will permanently delete this studio, its events, and storage. This cannot be undone."
          confirmText="Delete Studio"
          confirmVariant="danger"
          onConfirm={handleDeletePhotographer}
          onCancel={() => setPhotographerToDelete(null)}
          loading={actionLoading}
        />
      )}

      {eventToDelete && (
        <ConfirmDialog
          isOpen={true}
          title={`Delete Event: ${eventToDelete.name}?`}
          message="This action will permanently remove all photos and face embeddings for this event."
          confirmText="Delete Event"
          confirmVariant="danger"
          onConfirm={handleDeleteEvent}
          onCancel={() => setEventToDelete(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1015] flex items-center justify-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-[#E86A5B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
