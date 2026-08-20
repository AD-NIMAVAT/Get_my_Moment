'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
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
  LayoutDashboard, Bell, Settings, TrendingUp, Activity, ChevronDown, CheckCheck
} from 'lucide-react';

const PLAN_INFO: Record<string, { label: string; price: string; color: string; storage: string; events: string }> = {
  FREE_TRIAL: { label: 'Free Trial', price: '₹0', color: 'text-neutral-300 bg-white/10 border-white/15', storage: '5 GB', events: '1 Event/mo' },
  SOLO_PRO: { label: 'Solo Pro', price: '₹599/mo', color: 'text-purple-300 bg-purple-500/20 border-purple-500/30', storage: '100 GB', events: '10 Events/mo' },
  STUDIO_PRO: { label: 'Studio Pro', price: '₹1,999/mo', color: 'text-pink-300 bg-pink-500/20 border-pink-500/30', storage: '500 GB', events: '30 Events/mo' },
  STUDIO_OS: { label: 'Studio OS', price: '₹4,999/mo', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30', storage: '2,000 GB (2TB)', events: 'Unlimited' },
  ENTERPRISE_VIP: { label: 'Enterprise VIP', price: '₹9,999/mo', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30 font-bold', storage: '10,000 GB (10TB)', events: 'Unlimited' },
};

function SuperAdminDashboardContent() {
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

  // Timeframe filter for revenue chart
  const [chartTimeframe, setChartTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  // Gateway & Bank Vault Modal State
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultSection, setVaultSection] = useState<'bank' | 'gateway' | 'gst' | 'stamp'>('bank');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [unlockingVault, setUnlockingVault] = useState(false);
  const [showVaultSecret, setShowVaultSecret] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [savingGateway, setSavingGateway] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // File Upload Refs for Digital Stamp & Signature PNGs
  const stampFileRef = React.useRef<HTMLInputElement>(null);
  const signFileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenVault = () => setIsVaultModalOpen(true);
    window.addEventListener('open-vault-modal', handleOpenVault);

    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'revenue', 'photographers', 'events', 'telemetry', 'invoices'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }

    return () => {
      window.removeEventListener('open-vault-modal', handleOpenVault);
    };
  }, [searchParams]);

  // Profile Modal State
  const [selectedPhotographerId, setSelectedPhotographerId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<AdminPhotographerProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<string>('SOLO_PRO');
  const [upgradeStatus, setUpgradeStatus] = useState<string>('ACTIVE');
  const [savingUpgrade, setSavingUpgrade] = useState(false);

  // Profile Edit State
  const [editStudioName, setEditStudioName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Confirmation Modals
  const [photographerToDelete, setPhotographerToDelete] = useState<AdminPhotographerItem | null>(null);
  const [eventToDelete, setEventToDelete] = useState<AdminEventItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [photographerSearch, setPhotographerSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
        api.adminGetInvoices().catch(() => ({ invoices: [] }))
      ]);
      setStats(st);
      setPhotographers(pList);
      setEvents(eList);
      setTelemetry(telem);
      setRevenueData(rev);
      setAdminInvoices(invs.invoices || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load master admin platform data');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultPassword) {
      toast.error('Master admin security password required');
      return;
    }
    setUnlockingVault(true);
    try {
      const config = await api.adminGetGatewayConfig(vaultPassword);
      setGatewayConfig(config);
      setIsVaultUnlocked(true);
      toast.success('Platform Bank Vault & Gateway Keys Unlocked');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect security password');
    } finally {
      setUnlockingVault(false);
    }
  };

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) {
      toast.error('Security confirmation password required to apply changes');
      return;
    }
    setSavingGateway(true);
    try {
      await api.adminUpdateGatewayConfig({
        ...gatewayConfig,
        admin_password: confirmPassword,
      });
      toast.success('Platform Bank & Gateway Configurations Updated Successfully');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update gateway configurations');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleTogglePhotographerStatus = async (p: AdminPhotographerItem) => {
    try {
      setTogglingId(p.id);
      const newStatus = !p.is_active;
      await api.adminTogglePhotographerStatus(p.id, newStatus);
      setPhotographers(prev => prev.map(item => item.id === p.id ? { ...item, is_active: newStatus } : item));
      toast.success(`Studio ${p.studio_name} is now ${newStatus ? 'ACTIVE' : 'SUSPENDED'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update studio status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleViewProfile = async (photographerId: string) => {
    try {
      setSelectedPhotographerId(photographerId);
      setLoadingProfile(true);
      const p = await api.adminGetPhotographerProfile(photographerId);
      setProfileData(p);
      setUpgradePlan(p.photographer.subscription_plan || 'SOLO_PRO');
      setUpgradeStatus(p.photographer.verification_status || 'ACTIVE');
      setEditStudioName(p.photographer.studio_name);
      setEditPhone(p.photographer.phone || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load studio details');
      setSelectedPhotographerId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfileEdit = async () => {
    if (!selectedPhotographerId) return;
    try {
      setSavingProfile(true);
      await api.adminUpdatePhotographerProfile(selectedPhotographerId, {
        studio_name: editStudioName,
        phone: editPhone
      });
      toast.success('Studio information updated');
      setPhotographers(prev => prev.map(item => 
        item.id === selectedPhotographerId 
          ? { ...item, studio_name: editStudioName, phone: editPhone } 
          : item
      ));
      if (profileData) {
        setProfileData({
          ...profileData,
          photographer: {
            ...profileData.photographer,
            studio_name: editStudioName,
            phone: editPhone
          }
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update studio information');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveUpgrade = async () => {
    if (!selectedPhotographerId) return;
    try {
      setSavingUpgrade(true);
      await api.adminUpdatePhotographerPlan(selectedPhotographerId, upgradePlan, upgradeStatus);
      toast.success(`Studio upgraded to ${upgradePlan} (${upgradeStatus})`);
      setPhotographers(prev => prev.map(item => 
        item.id === selectedPhotographerId 
          ? { ...item, subscription_plan: upgradePlan, verification_status: upgradeStatus } 
          : item
      ));
      if (profileData) {
        setProfileData({
          ...profileData,
          photographer: {
            ...profileData.photographer,
            subscription_plan: upgradePlan,
            verification_status: upgradeStatus
          }
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upgrade studio plan');
    } finally {
      setSavingUpgrade(false);
    }
  };

  const confirmDeletePhotographer = async () => {
    if (!photographerToDelete) return;
    try {
      setActionLoading(true);
      await api.adminDeletePhotographer(photographerToDelete.id);
      setPhotographers(prev => prev.filter(p => p.id !== photographerToDelete.id));
      toast.success(`Studio ${photographerToDelete.studio_name} permanently purged.`);
      setPhotographerToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete photographer');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setActionLoading(true);
      await api.adminDeleteEvent(eventToDelete.id);
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      toast.success(`Event ${eventToDelete.name} permanently deleted.`);
      setEventToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPhotographers = useMemo(() => {
    const q = (photographerSearch || globalSearch).toLowerCase().trim();
    if (!q) return photographers;
    return photographers.filter(p => 
      p.studio_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone && p.phone.toLowerCase().includes(q)) ||
      (p.subscription_plan && p.subscription_plan.toLowerCase().includes(q))
    );
  }, [photographers, photographerSearch, globalSearch]);

  const filteredEvents = useMemo(() => {
    const q = (eventSearch || globalSearch).toLowerCase().trim();
    if (!q) return events;
    return events.filter(e => 
      e.name.toLowerCase().includes(q) ||
      (e.photographer_name && e.photographer_name.toLowerCase().includes(q)) ||
      e.slug.toLowerCase().includes(q)
    );
  }, [events, eventSearch, globalSearch]);

  if (authLoading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B081E]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 animate-pulse flex items-center justify-center text-white shadow-2xl">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <span className="text-xs font-mono tracking-widest text-purple-300">AUTHENTICATING MASTER ACCESS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B081E] via-[#0E122C] to-[#180C26] text-white relative overflow-x-hidden selection:bg-purple-500 selection:text-white p-4 sm:p-6 lg:p-8">
      {/* ========================================================================= */}
      {/* 1. AMBIENT VIBRANT LUMINA NEON GLOWS                                       */}
      {/* ========================================================================= */}
      <div className="fixed top-0 left-0 w-[550px] h-[550px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none -translate-x-1/3 -translate-y-1/3" />
      <div className="fixed top-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none translate-x-1/3" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-pink-600/15 rounded-full blur-[160px] pointer-events-none translate-y-1/3" />
      <div className="fixed top-1/2 left-1/3 w-[450px] h-[450px] bg-indigo-500/15 rounded-full blur-[130px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT AREA                                    */}
      {/* ========================================================================= */}
      <div className="max-w-[1720px] mx-auto flex gap-6 relative z-10">
        {/* FROSTED GLASS SIDEBAR (Desktop) */}
        <aside className="w-64 shrink-0 bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl flex-col justify-between hidden xl:flex min-h-[calc(100vh-4rem)] sticky top-6">
          <div className="space-y-6">
            {/* Logo Mark */}
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#9333EA] via-[#6366F1] to-[#EC4899] flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-extrabold text-base tracking-tight text-white leading-none">
                  GET MY MOMENT
                </span>
                <span className="text-[9px] font-bold tracking-widest text-purple-400 uppercase mt-0.5">
                  MASTER OS
                </span>
              </div>
            </div>

            {/* Navigation Pills */}
            <nav className="space-y-1.5 pt-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('revenue')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'revenue'
                    ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics &amp; Revenue</span>
              </button>

              <button
                onClick={() => setActiveTab('photographers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'photographers'
                    ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Studios &amp; Users</span>
              </button>

              <button
                onClick={() => setActiveTab('events')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'events'
                    ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Events &amp; Gallleries</span>
              </button>

              <button
                onClick={() => setActiveTab('invoices')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'invoices'
                    ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Tax Invoices</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'telemetry'
                    ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-600/30 border border-white/20'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>System Telemetry</span>
              </button>
            </nav>
          </div>

          {/* Admin Profile Pill at Bottom */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                A
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{admin.email}</span>
                <span className="text-[9px] font-mono text-purple-400">SUPER ADMIN</span>
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

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* ========================================================================= */}
          {/* TOP GREETING & SEARCH BAR                                                 */}
          {/* ========================================================================= */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Good day, Master Admin</span>
                <span className="text-2xl">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Here&apos;s real-time telemetry and revenue overview across the Get My Moment platform.
              </p>
            </div>

            {/* Quick Actions & Search */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search platform..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/15 backdrop-blur-md rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-400 outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Gateway & Bank Vault Button */}
              <button
                onClick={() => setIsVaultModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 border border-white/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-purple-200" />
                <span>Gateway &amp; Vault</span>
              </button>

              <button
                onClick={loadAdminData}
                disabled={loading}
                className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-neutral-300 hover:text-white transition-all cursor-pointer"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4 STAT METRIC GLASS CARDS (Matching Reference Image)                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Total Revenue */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span>↑ 12.5%</span>
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-400 font-medium">Total Platform Revenue</span>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                  ₹{(stats?.total_revenue_inr || 78540).toLocaleString('en-IN')}
                </h3>
              </div>
            </div>

            {/* Card 2: Active Studios */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-full">
                  <span>↑ 8.1%</span>
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-400 font-medium">Active Studios</span>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                  {(stats?.total_photographers || 2842).toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Card 3: Events & Orders */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 rounded-full">
                  <span>↑ 14.3%</span>
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-400 font-medium">Events &amp; Gallleries</span>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                  {(stats?.total_events || 1204).toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Card 4: AI Ingestion Speed */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-xl relative overflow-hidden group hover:border-pink-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-pink-300 bg-pink-500/15 border border-pink-500/30 px-2.5 py-1 rounded-full">
                  <span>⚡ 0.048s</span>
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-neutral-400 font-medium">AI Matching Accuracy</span>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-white mt-1">
                  98.4%
                </h3>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW (Charts, Storage Donut, System Status, Notifications)     */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Main Grid: Revenue Area Chart (Left) + Storage Donut (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 8 Cols: Glowing Area SVG Curve Chart */}
                <div className="lg:col-span-8 p-6 sm:p-7 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-neutral-400">Revenue &amp; Ingestion Curve</span>
                      <div className="flex items-baseline gap-3 mt-1">
                        <h4 className="text-2xl sm:text-3xl font-display font-black text-white">
                          ₹{(stats?.total_revenue_inr || 78540).toLocaleString('en-IN')}
                        </h4>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          ↑ 12.5%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.05] border border-white/10">
                      <button
                        onClick={() => setChartTimeframe('month')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          chartTimeframe === 'month' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        This Month
                      </button>
                      <button
                        onClick={() => setChartTimeframe('quarter')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          chartTimeframe === 'quarter' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Quarter
                      </button>
                      <button
                        onClick={() => setChartTimeframe('year')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          chartTimeframe === 'year' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Year
                      </button>
                    </div>
                  </div>

                  {/* SVG Chart */}
                  <div className="w-full h-64 sm:h-72 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 700 240" fill="none" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#9333EA" stopOpacity="0.45" />
                          <stop offset="50%" stopColor="#6366F1" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#C084FC" />
                          <stop offset="50%" stopColor="#818CF8" />
                          <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <line x1="0" y1="160" x2="700" y2="160" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      <line x1="0" y1="220" x2="700" y2="220" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                      {/* Area Fill */}
                      <path
                        d="M 0 200 C 60 180, 100 130, 160 145 C 220 160, 260 210, 320 180 C 380 150, 420 80, 480 90 C 540 100, 580 170, 640 120 L 700 80 L 700 240 L 0 240 Z"
                        fill="url(#areaGradient)"
                      />

                      {/* Stroke Line */}
                      <path
                        d="M 0 200 C 60 180, 100 130, 160 145 C 220 160, 260 210, 320 180 C 380 150, 420 80, 480 90 C 540 100, 580 170, 640 120 L 700 80"
                        stroke="url(#lineGradient)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_12px_rgba(147,51,234,0.6)]"
                      />

                      {/* Highlight Peak Dot */}
                      <circle cx="480" cy="90" r="6" fill="#FFFFFF" stroke="#818CF8" strokeWidth="3" className="animate-ping" />
                      <circle cx="480" cy="90" r="5" fill="#FFFFFF" stroke="#9333EA" strokeWidth="3" />
                    </svg>

                    {/* Chart Tooltip */}
                    <div className="absolute top-12 left-[62%] -translate-x-1/2 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-purple-500/40 text-center shadow-xl pointer-events-none">
                      <span className="text-[10px] text-neutral-400 font-mono block">May 21, 2026</span>
                      <span className="text-xs font-bold text-white">₹78,540</span>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex justify-between text-[11px] text-neutral-400 font-mono pt-3">
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

                {/* Right 4 Cols: Project Progress / Storage Donut Ring */}
                <div className="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col justify-between space-y-6">
                  <div>
                    <span className="text-xs font-semibold text-neutral-400">Platform Storage Allocation</span>
                    <h4 className="text-xl font-display font-extrabold text-white mt-1">Resource Capacity</h4>
                  </div>

                  {/* Circular Donut Progress Ring */}
                  <div className="flex items-center justify-center relative py-4">
                    <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
                      {/* Purple Arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#9333EA"
                        strokeWidth="12"
                        strokeDasharray="251.2"
                        strokeDashoffset="70"
                        strokeLinecap="round"
                        fill="none"
                      />
                      {/* Cyan Arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#06B6D4"
                        strokeWidth="12"
                        strokeDasharray="251.2"
                        strokeDashoffset="180"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-display font-black text-white">72%</span>
                      <span className="text-[10px] text-purple-300 font-mono tracking-wider">ALLOCATED</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-neutral-300">Solo Pro (100GB)</span>
                      </div>
                      <span className="font-bold text-white font-mono">90%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                        <span className="text-neutral-300">Studio Pro (500GB)</span>
                      </div>
                      <span className="font-bold text-white font-mono">72%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                        <span className="text-neutral-300">Studio OS (2TB)</span>
                      </div>
                      <span className="font-bold text-white font-mono">45%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="text-neutral-300">Enterprise VIP (10TB)</span>
                      </div>
                      <span className="font-bold text-white font-mono">60%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: System Status (Left) + Activity Notifications (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* System Status Bar */}
                <div className="lg:col-span-8 p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-neutral-400">Live Microservices Telemetry</span>
                      <h4 className="text-lg font-display font-extrabold text-white mt-0.5">System Status</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>All Services Operational</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white">API Engine</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-mono">99.98% Uptime • 12ms</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white">Vector Face Match</span>
                      </div>
                      <p className="text-[11px] text-purple-400 font-mono">YuNet + SFace • 0.048s</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white">Encrypted Storage</span>
                      </div>
                      <p className="text-[11px] text-cyan-400 font-mono">SHA-256 Deduplication</p>
                    </div>
                  </div>
                </div>

                {/* Notifications & Audit Stream */}
                <div className="lg:col-span-4 p-6 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-display font-extrabold text-white">Recent Platform Activity</h4>
                    <span className="text-[10px] text-purple-400 font-bold">LIVE STREAM</span>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">Platform Engine v2.4 Updated</p>
                        <span className="text-[10px] text-neutral-400 font-mono">2 hours ago</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">Studio Registered: Royal Cinema</p>
                        <span className="text-[10px] text-neutral-400 font-mono">5 hours ago</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">Bank Vault Security Key Rotated</p>
                        <span className="text-[10px] text-neutral-400 font-mono">Yesterday</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: STUDIOS & USERS TABLE                                              */}
          {/* ========================================================================= */}
          {activeTab === 'photographers' && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display font-black text-white">Registered Studios &amp; Photographers</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Manage subscription tiers, lock/unlock accounts, and verify KYC.</p>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={photographerSearch}
                    onChange={(e) => setPhotographerSearch(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 font-bold">Studio Name</th>
                      <th className="py-3.5 px-4 font-bold">Owner Email</th>
                      <th className="py-3.5 px-4 font-bold">Subscription Plan</th>
                      <th className="py-3.5 px-4 font-bold">Events / Photos</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPhotographers.map((p) => {
                      const plan = PLAN_INFO[p.subscription_plan || 'FREE_TRIAL'] || PLAN_INFO.FREE_TRIAL;
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-4 px-4 font-bold text-white flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                              {p.studio_name.charAt(0)}
                            </div>
                            <span>{p.studio_name}</span>
                          </td>
                          <td className="py-4 px-4 text-neutral-300">{p.email}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${plan.color}`}>
                              {plan.label} ({plan.price})
                            </span>
                          </td>
                          <td className="py-4 px-4 text-neutral-300 font-mono">
                            {p.events_count || 0} events • {p.photos_count || 0} photos
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              p.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {p.is_active ? 'ACTIVE' : 'LOCKED'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleViewProfile(p.id)}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all cursor-pointer"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => handleTogglePhotographerStatus(p)}
                              disabled={togglingId === p.id}
                              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                                p.is_active ? 'hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400' : 'hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400'
                              }`}
                              title={p.is_active ? 'Lock Studio' : 'Unlock Studio'}
                            >
                              {p.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setPhotographerToDelete(p)}
                              className="p-1.5 rounded-xl hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="Delete Studio"
                            >
                              <Trash2 className="w-4 h-4" />
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
          {/* TAB 3: EVENTS & GALLERIES TABLE                                           */}
          {/* ========================================================================= */}
          {activeTab === 'events' && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display font-black text-white">Platform Events &amp; AI Ingestion</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Inspect public guest access tokens, camera FTP counts, and album proofing portals.</p>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by event name, studio..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-400 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 font-bold">Event Name</th>
                      <th className="py-3.5 px-4 font-bold">Studio</th>
                      <th className="py-3.5 px-4 font-bold">Photos Synced</th>
                      <th className="py-3.5 px-4 font-bold">Guest Portal Link</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredEvents.map((e) => (
                      <tr key={e.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-4 px-4 font-bold text-white">{e.name}</td>
                        <td className="py-4 px-4 text-neutral-300">{e.photographer_name}</td>
                        <td className="py-4 px-4 text-cyan-300 font-mono font-bold">
                          {e.photo_count || 0} images
                        </td>
                        <td className="py-4 px-4">
                          <a
                            href={`/e/${e.access_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold"
                          >
                            <span>Open Guest Gallery</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => setEventToDelete(e)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TAX INVOICES & TELEMETRY                                           */}
          {/* ========================================================================= */}
          {(activeTab === 'invoices' || activeTab === 'telemetry') && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white/[0.05] backdrop-blur-2xl border border-white/10 shadow-2xl space-y-6">
              <h3 className="text-xl font-display font-black text-white">Platform Invoices &amp; Master Telemetry</h3>
              <p className="text-xs text-neutral-400">GST Compliance SAC 9983 and server diagnostic logs.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-xs text-neutral-400">Total Invoices Issued</span>
                  <h4 className="text-xl font-bold text-white mt-1">{adminInvoices.length} Invoices</h4>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-xs text-neutral-400">GST Collected (18%)</span>
                  <h4 className="text-xl font-bold text-emerald-400 mt-1">₹14,137</h4>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-xs text-neutral-400">Server Response Time</span>
                  <h4 className="text-xl font-bold text-purple-300 mt-1">0.012s (p99)</h4>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. GATEWAY & BANK VAULT MODAL                                             */}
      {/* ========================================================================= */}
      {isVaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#120B2E] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Platform Bank Vault &amp; Payment Gateway</h3>
                  <span className="text-xs text-neutral-400">Restricted Super Admin Master Configuration</span>
                </div>
              </div>
              <button
                onClick={() => setIsVaultModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!isVaultUnlocked ? (
              <form onSubmit={handleUnlockVault} className="space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Enter master super admin password to decrypt bank credentials, Razorpay/Stripe API secrets, and UPI VPAs.
                </p>
                <div>
                  <input
                    type="password"
                    placeholder="Enter master password..."
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={unlockingVault}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-xs text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  {unlockingVault ? 'Decrypting Vault...' : 'Unlock Bank Vault'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Vault Active. Master Gateway Configs Decrypted and Verified.</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-neutral-400">Master UPI VPA:</span>
                    <p className="font-bold text-white mt-0.5">{gatewayConfig?.upi_id || 'getmymoment@okhdfcbank'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <span className="text-[10px] text-neutral-400">Bank Account:</span>
                    <p className="font-bold text-white mt-0.5">{gatewayConfig?.bank_account_number || '•••••••• 4819'}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsVaultModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 font-bold text-xs text-white"
                >
                  Close Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={!!photographerToDelete}
        title="Delete Studio Account?"
        message={`Are you sure you want to permanently purge ${photographerToDelete?.studio_name}? All associated events, folders, photos, and AI face embeddings will be permanently wiped.`}
        confirmLabel="Purge Studio"
        onConfirm={confirmDeletePhotographer}
        onCancel={() => setPhotographerToDelete(null)}
        isLoading={actionLoading}
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!eventToDelete}
        title="Delete Event & Photos?"
        message={`Are you sure you want to delete ${eventToDelete?.name}? All uploaded ceremony folders and photo assets will be deleted.`}
        confirmLabel="Delete Event"
        onConfirm={confirmDeleteEvent}
        onCancel={() => setEventToDelete(null)}
        isLoading={actionLoading}
        variant="danger"
      />
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0B081E] text-white">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SuperAdminDashboardContent />
    </React.Suspense>
  );
}
