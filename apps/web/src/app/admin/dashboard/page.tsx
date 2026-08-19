'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NeomorphicSelect } from '@/components/NeomorphicSelect';
import { 
  api, AdminPlatformStats, AdminPhotographerItem, AdminEventItem, 
  AdminPhotographerProfileResponse 
} from '@/lib/api';
import { 
  ShieldCheck, Users, Camera, Sparkles, Layers, IndianRupee, 
  Trash2, CheckCircle2, XCircle, Search, ExternalLink, RefreshCw, 
  LogOut, Cpu, AlertTriangle, KeyRound, ArrowUpRight, BarChart3, 
  Check, X, Crown, Zap, Calendar, HardDrive, Phone, Mail, Edit3, Save, Plus,
  Lock, Unlock, Eye, EyeOff, Building2, CreditCard, QrCode, FileText, UploadCloud
} from 'lucide-react';

const PLAN_INFO: Record<string, { label: string; price: string; color: string; storage: string; events: string }> = {
  FREE_TRIAL: { label: 'Free Trial', price: '₹0', color: 'text-[#6B6B6B] bg-neutral-100 border-[#E8E5E2]', storage: '5 GB', events: '1 Event/mo' },
  SOLO_PRO: { label: 'Solo Pro', price: '₹599/mo', color: 'text-[#E86A5B] bg-[#E86A5B]/10 border-[#E86A5B]/25', storage: '100 GB', events: '10 Events/mo' },
  STUDIO_PRO: { label: 'Studio Pro', price: '₹1,999/mo', color: 'text-[#C94F43] bg-[#C94F43]/10 border-[#C94F43]/25', storage: '500 GB', events: '30 Events/mo' },
  STUDIO_OS: { label: 'Studio OS', price: '₹4,999/mo', color: 'text-[#8F6420] bg-[#D9A441]/15 border-[#D9A441]/30', storage: '2,000 GB (2TB)', events: 'Unlimited' },
  ENTERPRISE_VIP: { label: 'Enterprise VIP', price: '₹9,999/mo', color: 'text-[#1F1F1F] bg-neutral-100 border-[#E8E5E2] font-bold', storage: '10,000 GB (10TB)', events: 'Unlimited' },
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
    if (tabParam && ['overview', 'revenue', 'photographers', 'events', 'telemetry'].includes(tabParam)) {
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
        api.adminGetSubscriptionInvoices().catch(() => []),
      ]);
      setStats(st);
      setPhotographers(pList);
      setEvents(eList);
      setTelemetry(telem);
      setRevenueData(rev);
      setAdminInvoices(invs || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPhotographerProfile = async (photographerId: string) => {
    setSelectedPhotographerId(photographerId);
    setLoadingProfile(true);
    try {
      const data = await api.adminGetPhotographerProfile(photographerId);
      setProfileData(data);
      setUpgradePlan(data.subscription_plan || 'SOLO_PRO');
      setUpgradeStatus(data.subscription_status || 'ACTIVE');
      setEditStudioName(data.studio_name);
      setEditPhone(data.phone || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load photographer profile');
      setSelectedPhotographerId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleApplySubscriptionUpgrade = async () => {
    if (!selectedPhotographerId) return;
    setSavingUpgrade(true);
    try {
      const res = await api.adminUpdatePhotographerSubscription(selectedPhotographerId, {
        subscription_plan: upgradePlan,
        subscription_status: upgradeStatus,
      });
      toast.success(`Plan successfully updated to ${PLAN_INFO[res.subscription_plan]?.label || res.subscription_plan}!`);
      
      if (profileData) {
        setProfileData({
          ...profileData,
          subscription_plan: res.subscription_plan,
          subscription_status: res.subscription_status,
          max_storage_gb: res.max_storage_gb,
          max_events_per_month: res.max_events_per_month,
        });
      }
      setPhotographers(photographers.map((p) => p.id === selectedPhotographerId ? {
        ...p,
        subscription_plan: res.subscription_plan,
        subscription_status: res.subscription_status,
        max_storage_gb: res.max_storage_gb,
        max_events_per_month: res.max_events_per_month,
      } : p));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update plan');
    } finally {
      setSavingUpgrade(false);
    }
  };

  const handleSaveProfileDetails = async () => {
    if (!selectedPhotographerId) return;
    setSavingProfile(true);
    try {
      await api.adminUpdatePhotographerProfile(selectedPhotographerId, {
        studio_name: editStudioName.trim(),
        phone: editPhone.trim(),
      });
      toast.success('Studio details updated successfully!');
      if (profileData) {
        setProfileData({
          ...profileData,
          studio_name: editStudioName.trim(),
          phone: editPhone.trim(),
        });
      }
      setPhotographers(photographers.map((p) => p.id === selectedPhotographerId ? {
        ...p,
        studio_name: editStudioName.trim(),
        phone: editPhone.trim(),
      } : p));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update studio profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTogglePhotographerActive = async (p: AdminPhotographerItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingId(p.id);
    try {
      const res = await api.adminUpdatePhotographerStatus(p.id, { is_active: !p.is_active });
      setPhotographers(photographers.map((item) => item.id === p.id ? { ...item, is_active: res.is_active } : item));
      if (profileData && profileData.id === p.id) {
        setProfileData({ ...profileData, is_active: res.is_active });
      }
      toast.success(`Studio ${p.studio_name} is now ${res.is_active ? 'ACTIVE' : 'SUSPENDED'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTogglePhotographerVerified = async (p: AdminPhotographerItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingId(p.id);
    try {
      const res = await api.adminUpdatePhotographerStatus(p.id, { is_verified: !p.is_verified });
      setPhotographers(photographers.map((item) => item.id === p.id ? { ...item, is_verified: res.is_verified } : item));
      if (profileData && profileData.id === p.id) {
        setProfileData({ ...profileData, is_verified: res.is_verified });
      }
      toast.success(`Studio ${p.studio_name} is now ${res.is_verified ? 'VERIFIED ✨' : 'STANDARD'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify studio');
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDeletePhotographer = async () => {
    if (!photographerToDelete) return;
    setActionLoading(true);
    try {
      await api.adminDeletePhotographer(photographerToDelete.id);
      setPhotographers(photographers.filter((item) => item.id !== photographerToDelete.id));
      if (selectedPhotographerId === photographerToDelete.id) {
        setSelectedPhotographerId(null);
      }
      toast.success(`Studio "${photographerToDelete.studio_name}" deleted`);
      setPhotographerToDelete(null);
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete photographer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    setActionLoading(true);
    try {
      await api.adminDeleteEvent(eventToDelete.id);
      setEvents(events.filter((item) => item.id !== eventToDelete.id));
      toast.success(`Event "${eventToDelete.name}" deleted by Superadmin`);
      setEventToDelete(null);
      await loadAdminData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultPassword) {
      toast.error('Please enter your SuperAdmin password');
      return;
    }
    setUnlockingVault(true);
    try {
      await api.adminUnlockGatewayVault(vaultPassword);
      const cfg = await api.adminGetGatewaySettings();
      setGatewayConfig(cfg);
      setIsVaultUnlocked(true);
      setVaultPassword('');
      toast.success('🔓 Gateway & Bank Vault Unlocked!');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect SuperAdmin password');
    } finally {
      setUnlockingVault(false);
    }
  };

  const handleConfirmSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) {
      toast.error('Please enter your SuperAdmin password to authorize changes');
      return;
    }
    setSavingGateway(true);
    try {
      const res = await api.adminUpdateGatewaySettings({
        ...gatewayConfig,
        confirm_password: confirmPassword,
      });
      toast.success(res.message);
      setConfirmPassword('');
      // Auto-lock and close vault modal immediately on save
      setIsVaultUnlocked(false);
      setGatewayConfig(null);
      setIsVaultModalOpen(false);
      toast.info('🔒 Gateway & Bank Vault has been saved & automatically locked for security.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSavingGateway(false);
    }
  };

  if (authLoading || (loading && !stats)) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <div className="h-32 rounded-3xl skeleton-shimmer" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
            ))}
          </div>
          <div className="h-96 rounded-3xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const filteredPhotographers = photographers.filter((p) => 
    p.studio_name.toLowerCase().includes(photographerSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(photographerSearch.toLowerCase())
  );

  const filteredEvents = events.filter((e) => 
    e.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    e.studio_name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    e.access_token.toLowerCase().includes(eventSearch.toLowerCase())
  );

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Superadmin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E8E5E2]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20 mb-2 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>PLATFORM OWNER & SUPER ADMIN CONTROL CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
            Get My Moment Master Command
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 font-normal">
            Platform governance, studio onboarding, subscription upgrades, events surveillance, and AI infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#3FA66B] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#3FA66B] animate-pulse" />
            <span>AI ENGINE LIVE</span>
          </div>

          <button
            onClick={loadAdminData}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E8E5E2] hover:border-[#E86A5B] text-[#1F1F1F] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5 sm:gap-4 my-8">
        <div className="neu-card p-4 sm:p-5">
          <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Studios</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] mt-1">{stats?.total_photographers}</div>
          <span className="text-[10px] text-[#3FA66B] font-bold">Registered Studios</span>
        </div>

        <div className="neu-card p-4 sm:p-5">
          <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Events</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#E86A5B] mt-1">{stats?.total_events}</div>
          <span className="text-[10px] text-[#6B6B6B]">Live catalogs</span>
        </div>

        <div className="neu-card p-4 sm:p-5">
          <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Photos</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] mt-1">{stats?.total_photos}</div>
          <span className="text-[10px] text-[#6B6B6B]">Cloud Storage</span>
        </div>

        <div className="neu-card p-4 sm:p-5">
          <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Face Vectors</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#D9A441] mt-1">{stats?.total_faces_indexed}</div>
          <span className="text-[10px] text-[#D9A441] font-bold">Biometric Vectors</span>
        </div>

        <div className="neu-card p-4 sm:p-5">
          <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Searches</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#3FA66B] mt-1">{stats?.total_guest_searches}</div>
          <span className="text-[10px] text-[#3FA66B] font-bold">Guest Matches</span>
        </div>

        <div className="neu-card p-4 sm:p-5 border-2 border-[#D9A441]/50">
          <span className="text-[11px] font-bold text-[#8F6420] uppercase tracking-wider block">Platform GMV</span>
          <div className="text-xl sm:text-2xl font-extrabold text-[#D9A441] mt-1">₹{(stats?.total_platform_gmv_inr || 0).toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-[#D9A441] font-bold">Gross Event Value</span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] mb-8 no-scrollbar">
        {[
          { id: 'overview', label: '📊 Platform Overview' },
          { id: 'revenue', label: `💳 Subscriptions & Settlements (${revenueData?.total_transactions_count || 0})` },
          { id: 'invoices', label: `🧾 Studio Tax Invoices (${adminInvoices.length})` },
          { id: 'photographers', label: `📸 Studios & Subscriptions (${photographers.length})` },
          { id: 'events', label: `🗓️ All Events Master (${events.length})` },
          { id: 'telemetry', label: '⚡ AI Telemetry' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                  : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: REVENUE & BANK SETTLEMENTS */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase block">Monthly Recurring (MRR)</span>
              <div className="text-2xl font-extrabold text-[#E86A5B] mt-1">₹{(revenueData?.mrr_inr || 0).toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-[#6B6B6B]">ARR: ₹{((revenueData?.mrr_inr || 0) * 12).toLocaleString('en-IN')}</span>
            </div>

            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase block">Total Subscription GMV</span>
              <div className="text-2xl font-extrabold text-[#1F1F1F] mt-1">₹{(revenueData?.total_gross_gmv_inr || 0).toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-[#3FA66B] font-bold">{revenueData?.total_transactions_count || 0} Transactions</span>
            </div>

            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase block">Gateway MDR Deductions</span>
              <div className="text-2xl font-extrabold text-[#6B6B6B] mt-1">₹{(revenueData?.total_gateway_fees_inr || 0).toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-[#6B6B6B]">2.0% + 18% GST</span>
            </div>

            <div className="neu-card p-5 border-2 border-emerald-500/40">
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">Net Bank Settlement</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{(revenueData?.total_net_bank_settled_inr || 0).toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-emerald-700 font-bold">Direct Bank Deposits (T+1)</span>
            </div>
          </div>

          {/* Transactions Feed */}
          <div className="neu-card p-7">
            <h3 className="text-base font-display font-extrabold text-[#1F1F1F] mb-4 flex items-center justify-between">
              <span>Recent Subscription Transactions & Settlements</span>
              <span className="text-xs font-mono font-normal text-[#6B6B6B]">Gateway: {revenueData?.payment_gateway?.toUpperCase()} ({revenueData?.payment_mode?.toUpperCase()})</span>
            </h3>

            {(!revenueData?.recent_transactions || revenueData.recent_transactions.length === 0) ? (
              <div className="p-8 text-center text-xs text-[#6B6B6B]">No subscription payment transactions recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2DDD5] text-[#6B6B6B] uppercase text-[10px]">
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold">Studio Name</th>
                      <th className="pb-3 font-bold">Plan Tier</th>
                      <th className="pb-3 font-bold">Gross Paid</th>
                      <th className="pb-3 font-bold">Gateway Fee</th>
                      <th className="pb-3 font-bold">Net Bank Deposit</th>
                      <th className="pb-3 font-bold">Mode</th>
                      <th className="pb-3 font-bold">Gateway Payment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD5]">
                    {revenueData.recent_transactions.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#FAF9F7]">
                        <td className="py-3 text-[#6B6B6B]">{new Date(tx.paid_at).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 font-bold text-[#1F1F1F]">{tx.studio_name}</td>
                        <td className="py-3 font-bold text-[#E86A5B]">{tx.plan_key} ({tx.billing_cycle})</td>
                        <td className="py-3 font-extrabold text-[#1F1F1F]">₹{tx.amount_inr.toLocaleString('en-IN')}</td>
                        <td className="py-3 text-[#6B6B6B]">₹{tx.gateway_fee_inr.toLocaleString('en-IN')}</td>
                        <td className="py-3 font-bold text-emerald-600">₹{tx.net_bank_settlement_inr.toLocaleString('en-IN')}</td>
                        <td className="py-3"><span className="px-2 py-0.5 rounded-full bg-neutral-100 font-mono text-[10px]">{tx.payment_method}</span></td>
                        <td className="py-3 font-mono text-[#6B6B6B]">{tx.gateway_payment_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-7 rounded-3xl bg-white border border-[#E8E5E2] shadow-sm">
              <h3 className="text-lg font-display font-extrabold text-[#1F1F1F] mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#E86A5B]" />
                <span>Recent Studio Onboardings & Plans</span>
              </h3>
              <div className="space-y-3">
                {photographers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#6B6B6B]">No studios registered yet.</div>
                ) : (
                  photographers.slice(0, 5).map((p) => {
                    const plan = PLAN_INFO[p.subscription_plan] || PLAN_INFO.SOLO_PRO;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => handleOpenPhotographerProfile(p.id)}
                        className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] hover:border-[#E86A5B] flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1F1F1F]">{p.studio_name}</span>
                            {p.is_verified && (
                              <span className="px-2 py-0.5 rounded-full bg-[#D9A441]/15 text-[#8F6420] border border-[#D9A441]/30 text-[10px] font-bold">
                                Verified
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${plan.color}`}>
                              {plan.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">{p.email}</span>
                        </div>
                        <div className="text-right text-xs font-medium text-[#1F1F1F]">
                          <div className="font-bold">{p.total_events} Events</div>
                          <div className="text-[11px] text-[#6B6B6B]">{p.total_photos} Photos</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-7 rounded-3xl bg-white border border-[#E8E5E2] shadow-sm">
              <h3 className="text-lg font-display font-extrabold text-[#1F1F1F] mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#E86A5B]" />
                <span>Latest Platform Events</span>
              </h3>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#6B6B6B]">No events created across the platform yet.</div>
                ) : (
                  events.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#1F1F1F] block">{ev.name}</span>
                        <span className="text-[11px] text-[#6B6B6B] mt-0.5 block">{ev.studio_name} • <code className="text-[#E86A5B] font-bold">{ev.access_token}</code></span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#D9A441] block">
                          ₹{ev.package_amount_inr.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-[#6B6B6B]">
                          {ev.photo_count} photos • {ev.guest_count} guests
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: STUDIO SUBSCRIPTION INVOICES (OWNER COPY) */}
      {activeTab === 'invoices' && (
        <div className="space-y-6 animate-tab-fade">
          <div className="neu-card p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5E2]">
              <div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#E86A5B]" />
                  Studio Subscription GST Tax Invoices (Owner Copy)
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">
                  Platform owner copy of all official GST tax compliance invoices issued to subscribed studios.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search studio, invoice #, email..."
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="neu-input w-full pl-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {adminInvoices.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#6B6B6B]">
                <FileText className="w-10 h-10 text-[#8E8E8E] mx-auto mb-2 opacity-50" />
                <span>No subscription invoices generated yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E8E5E2] text-[#6B6B6B] uppercase text-[10px]">
                      <th className="pb-3 font-bold">Invoice Number</th>
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold">Studio & Contact</th>
                      <th className="pb-3 font-bold">Plan Name</th>
                      <th className="pb-3 font-bold text-right">Taxable Amount</th>
                      <th className="pb-3 font-bold text-right">18% GST</th>
                      <th className="pb-3 font-bold text-right">Total Paid</th>
                      <th className="pb-3 font-bold text-center">Status</th>
                      <th className="pb-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5E2]">
                    {adminInvoices
                      .filter((inv) =>
                        (inv.invoice_number || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        (inv.buyer_studio_name || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        (inv.buyer_email || '').toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        (inv.plan_name || '').toLowerCase().includes(invoiceSearch.toLowerCase())
                      )
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#FAF9F7] transition-colors">
                          <td className="py-3.5 font-bold font-mono text-[#E86A5B]">{inv.invoice_number}</td>
                          <td className="py-3.5 text-[#6B6B6B]">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                          <td className="py-3.5">
                            <div className="font-bold text-[#1F1F1F]">{inv.buyer_studio_name}</div>
                            <div className="text-[11px] text-[#6B6B6B]">{inv.buyer_email} {inv.buyer_phone ? `• ${inv.buyer_phone}` : ''}</div>
                          </td>
                          <td className="py-3.5 font-bold text-[#1F1F1F]">{inv.plan_name}</td>
                          <td className="py-3.5 text-right font-medium text-[#1F1F1F]">₹{inv.taxable_amount_inr.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 text-right text-[#6B6B6B]">₹{inv.total_tax_inr.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 text-right font-extrabold text-[#3FA66B]">₹{inv.total_amount_inr.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 text-center">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#3FA66B] font-bold text-[10px] border border-emerald-200">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const url = api.getInvoiceHtmlUrl(inv.id, true);
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="neu-btn-secondary py-1.5 px-3 text-[11px] inline-flex items-center gap-1.5 cursor-pointer hover:text-[#E86A5B]"
                              title="Print or Save official GST Tax Invoice as PDF with Superadmin Stamp"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#E86A5B]" />
                              <span>Print / PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PHOTOGRAPHERS MANAGEMENT */}
      {activeTab === 'photographers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={photographerSearch}
                onChange={(e) => setPhotographerSearch(e.target.value)}
                placeholder="Search studio name or email..."
                className="gmm-input pl-10 text-xs"
              />
            </div>
            <span className="text-xs text-[#6B6B6B] font-medium">Showing {filteredPhotographers.length} Studios • Click any row to open Profile & Upgrade Plan</span>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-white border border-[#E8E5E2] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F7] text-[#6B6B6B] font-bold uppercase text-[10px] border-b border-[#E8E5E2]">
                <tr>
                  <th className="py-4 px-5">Studio / Photographer</th>
                  <th className="py-4 px-4">Active Plan & Tier</th>
                  <th className="py-4 px-4">Quotas</th>
                  <th className="py-4 px-4">Events</th>
                  <th className="py-4 px-4">Photos</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Verification</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5E2] text-[#1F1F1F]">
                {filteredPhotographers.map((p) => {
                  const plan = PLAN_INFO[p.subscription_plan] || PLAN_INFO.SOLO_PRO;
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => handleOpenPhotographerProfile(p.id)}
                      className="hover:bg-[#FAF9F7] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#1F1F1F] group-hover:text-[#E86A5B] transition-colors flex items-center gap-1.5">
                          <span>{p.studio_name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#E86A5B] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] font-medium">{p.email}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${plan.color}`}>
                          <Crown className="w-3 h-3" />
                          <span>{plan.label} ({plan.price})</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[#6B6B6B] text-[11px]">
                        <div className="font-bold text-[#1F1F1F]">{p.max_storage_gb} GB Storage</div>
                        <div className="text-[10px] text-[#6B6B6B]">{p.max_events_per_month} events/mo</div>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1F1F1F]">{p.total_events}</td>
                      <td className="py-4 px-4 text-[#6B6B6B]">{p.total_photos}</td>
                      <td className="py-4 px-4">
                        <button
                          onClick={(e) => handleTogglePhotographerActive(p, e)}
                          disabled={togglingId === p.id}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            p.is_active
                              ? 'bg-emerald-50 text-[#3FA66B] border-emerald-200'
                              : 'bg-rose-50 text-rose-600 border-rose-200'
                          }`}
                        >
                          {p.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={(e) => handleTogglePhotographerVerified(p, e)}
                          disabled={togglingId === p.id}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            p.is_verified
                              ? 'bg-[#D9A441]/15 text-[#8F6420] border-[#D9A441]/30'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {p.is_verified ? '✨ Verified' : 'In Review'}
                        </button>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenPhotographerProfile(p.id)}
                            className="px-3 py-1.5 rounded-xl border border-[#E8E5E2] hover:border-[#E86A5B] bg-white text-[#1F1F1F] text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Profile & Plan
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotographerToDelete(p);
                            }}
                            className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                            title="Delete Studio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ALL EVENTS MASTER */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-[#8E8E8E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search event, studio, token..."
                className="gmm-input pl-10 text-xs"
              />
            </div>
            <span className="text-xs text-[#6B6B6B] font-medium">Showing {filteredEvents.length} Events Across All Studios</span>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-white border border-[#E8E5E2] shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F7] text-[#6B6B6B] font-bold uppercase text-[10px] border-b border-[#E8E5E2]">
                <tr>
                  <th className="py-4 px-5">Event Name</th>
                  <th className="py-4 px-4">Studio</th>
                  <th className="py-4 px-4">Contract GMV</th>
                  <th className="py-4 px-4">Photos</th>
                  <th className="py-4 px-4">Guests</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5E2] text-[#1F1F1F]">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#FAF9F7] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#1F1F1F]">{ev.name}</div>
                      <div className="text-[11px] text-[#6B6B6B] font-mono">Token: {ev.access_token}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-[#1F1F1F] font-bold">{ev.studio_name}</div>
                      <div className="text-[11px] text-[#6B6B6B]">{ev.photographer_email}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#D9A441]">
                      ₹{ev.package_amount_inr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 font-bold text-[#1F1F1F]">{ev.photo_count}</td>
                    <td className="py-4 px-4 text-[#6B6B6B]">{ev.guest_count}</td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#3FA66B] border border-emerald-200">
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/e/${ev.access_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl border border-[#E8E5E2] hover:bg-neutral-50 text-[#1F1F1F] transition-all inline-flex items-center"
                          title="Open Guest View"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setEventToDelete(ev)}
                          className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                          title="Force Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AI TELEMETRY */}
      {activeTab === 'telemetry' && telemetry && (
        <div className="space-y-6">
          <div className="p-7 rounded-3xl bg-white border border-[#E8E5E2] shadow-sm">
            <h3 className="text-lg font-display font-extrabold text-[#1F1F1F] mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#E86A5B]" />
              <span>AI Face Engine Status & Calibration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-1">
                <span className="text-xs text-[#6B6B6B] font-bold uppercase">Deep Face Detector</span>
                <div className="text-base font-extrabold text-[#1F1F1F]">{telemetry.detector_model}</div>
                <span className="text-[11px] text-[#3FA66B] font-bold block">Status: Online • ONNX Runtime Engine</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-1">
                <span className="text-xs text-[#6B6B6B] font-bold uppercase">Face Recognizer & Embeddings</span>
                <div className="text-base font-extrabold text-[#1F1F1F]">{telemetry.recognizer_model}</div>
                <span className="text-[11px] text-[#3FA66B] font-bold block">Cosine Similarity Metric (&gt;= 0.90 Accuracy Filter)</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-1">
                <span className="text-xs text-[#6B6B6B] font-bold uppercase">Stored Face Vector Embeddings</span>
                <div className="text-2xl font-extrabold text-[#E86A5B]">{telemetry.total_embeddings_stored}</div>
                <span className="text-[11px] text-[#6B6B6B]">128-dimensional float32 vectors</span>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-1">
                <span className="text-xs text-[#6B6B6B] font-bold uppercase">Guest Searches Served</span>
                <div className="text-2xl font-extrabold text-[#3FA66B]">{telemetry.total_guest_searches_served}</div>
                <span className="text-[11px] text-[#6B6B6B]">&lt; 50ms average matching latency</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHOTOGRAPHER FULL PROFILE & SUBSCRIPTION UPGRADE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!selectedPhotographerId}
        onClose={() => setSelectedPhotographerId(null)}
        title={profileData?.studio_name || 'Studio Profile'}
        subtitle="Manage studio subscription tier, storage quota, and professional verification status."
        size="xl"
        icon={<Crown className="w-5 h-5 text-[#E86A5B]" />}
      >
        {loadingProfile || !profileData ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#E86A5B] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-[#6B6B6B]">Loading studio profile & metrics...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Status Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5E2]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    profileData.is_verified
                      ? 'bg-[#D9A441]/15 text-[#8F6420] border-[#D9A441]/30'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {profileData.is_verified ? '✨ Verified Studio Pro' : 'KYC Under Review'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    profileData.is_active 
                      ? 'bg-emerald-50 text-[#3FA66B] border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    {profileData.is_active ? 'ACTIVE ACCOUNT' : 'SUSPENDED'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6B6B6B] mt-2 flex-wrap">
                  <span>Email: <strong className="text-[#1F1F1F]">{profileData.email}</strong></span>
                  {profileData.phone && <span>Phone: <strong className="text-[#1F1F1F]">{profileData.phone}</strong></span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTogglePhotographerActive(profileData as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    profileData.is_active
                      ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-[#3FA66B] border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {profileData.is_active ? 'Suspend Studio' : 'Activate Studio'}
                </button>
                <button
                  onClick={() => handleTogglePhotographerVerified(profileData as any)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#D9A441]/40 bg-[#D9A441]/15 hover:bg-[#D9A441]/25 text-[#8F6420] transition-all cursor-pointer"
                >
                  {profileData.is_verified ? 'Remove Verification' : 'Verify Studio ✨'}
                </button>
              </div>
            </div>

            {/* KYC Details Card */}
            <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-3">
              <span className="text-xs font-bold text-[#E86A5B] uppercase block">Studio KYC & Professional Verification</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] block">Location</span>
                  <span className="font-bold text-[#1F1F1F]">{profileData.city || 'Not specified'}{profileData.state ? `, ${profileData.state}` : ''}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] block">Instagram</span>
                  <span className="font-bold text-[#E86A5B]">{profileData.instagram_handle || 'Not provided'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] block">Experience</span>
                  <span className="font-bold text-[#1F1F1F]">{profileData.years_of_experience || '3-5 Years'}</span>
                </div>
              </div>
            </div>

            {/* Plan Upgrade Controls */}
            <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-4">
              <span className="text-xs font-bold text-[#1F1F1F] uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Upgrade / Change Studio Plan Tier</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(PLAN_INFO).map(([key, info]) => {
                  const isSelected = upgradePlan === key;
                  return (
                    <div
                      key={key}
                      onClick={() => setUpgradePlan(key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white border-2 border-[#E86A5B] shadow-md scale-[1.01]'
                          : 'bg-white border-[#E8E5E2] hover:border-[#F3A08F]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1F1F1F]">{info.label}</span>
                        <span className="text-xs font-bold text-[#E86A5B]">{info.price}</span>
                      </div>
                      <div className="text-[11px] text-[#6B6B6B] mt-1">
                        {info.storage} • {info.events}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6B6B6B] font-bold">Status:</span>
                  <div className="w-40">
                    <NeomorphicSelect
                      value={upgradeStatus}
                      onChange={setUpgradeStatus}
                      options={[
                        { value: 'ACTIVE', label: 'ACTIVE' },
                        { value: 'TRIAL', label: 'TRIAL' },
                        { value: 'EXPIRED', label: 'EXPIRED' },
                        { value: 'SUSPENDED', label: 'SUSPENDED' },
                      ]}
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplySubscriptionUpgrade}
                  disabled={savingUpgrade}
                  className="btn-primary text-xs"
                >
                  <Crown className="w-4 h-4 stroke-[2.5]" />
                  <span>{savingUpgrade ? 'Applying Plan Upgrade...' : 'Apply Plan Upgrade'}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#FAF9F7] rounded-xl border border-[#E8E5E2]">
                <span className="text-[10px] text-[#6B6B6B] font-bold uppercase">Contracted GMV</span>
                <div className="text-base font-extrabold text-[#D9A441] mt-0.5">₹{profileData.total_contracted_gmv_inr.toLocaleString('en-IN')}</div>
              </div>
              <div className="p-3.5 bg-[#FAF9F7] rounded-xl border border-[#E8E5E2]">
                <span className="text-[10px] text-[#6B6B6B] font-bold uppercase">Events Created</span>
                <div className="text-base font-extrabold text-[#1F1F1F] mt-0.5">{profileData.total_events}</div>
              </div>
              <div className="p-3.5 bg-[#FAF9F7] rounded-xl border border-[#E8E5E2]">
                <span className="text-[10px] text-[#6B6B6B] font-bold uppercase">Photos Ingested</span>
                <div className="text-base font-extrabold text-[#E86A5B] mt-0.5">{profileData.total_photos}</div>
              </div>
              <div className="p-3.5 bg-[#FAF9F7] rounded-xl border border-[#E8E5E2]">
                <span className="text-[10px] text-[#6B6B6B] font-bold uppercase">Guests Matched</span>
                <div className="text-base font-extrabold text-[#3FA66B] mt-0.5">{profileData.total_guests_matched}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* PASSWORD-PROTECTED GATEWAY & BANK VAULT POPUP MODAL */}
      {isVaultModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsVaultModalOpen(false);
            setVaultPassword('');
            setConfirmPassword('');
          }}
          title={isVaultUnlocked ? "🏦 Payment Gateway & Owner Bank Control" : "🔐 Security Vault Locked"}
          subtitle={isVaultUnlocked ? "Configure settlement bank account, UPI ID, Razorpay keys & GST invoicing" : "SuperAdmin security password required to access credentials"}
          size={isVaultUnlocked ? "xl" : "md"}
        >
          {!isVaultUnlocked ? (
            /* LOCKED VAULT FORM */
            <div className="py-3 text-center space-y-6 animate-tab-fade">
              <div className="w-16 h-16 rounded-3xl bg-[#E86A5B]/10 text-[#E86A5B] flex items-center justify-center mx-auto shadow-inner transition-transform duration-300 hover:scale-105">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-base font-display font-extrabold text-[#1F1F1F]">Enter SuperAdmin Password</h4>
                <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">
                  To view and modify Website Owner Bank Accounts, UPI ID, Razorpay API credentials, and GST Tax Invoicing, enter your SuperAdmin security password below.
                </p>
              </div>

              <form onSubmit={handleUnlockVault} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">SuperAdmin Password *</label>
                  <div className="relative">
                    <input
                      type={showVaultSecret ? 'text' : 'password'}
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      placeholder="Enter Admin@..."
                      className="neu-input w-full text-xs pr-10 transition-all duration-200"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowVaultSecret(!showVaultSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-[#1F1F1F] transition-colors"
                    >
                      {showVaultSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Protected by 256-bit PBKDF2 encryption & audit logging.</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVaultModalOpen(false);
                      setVaultPassword('');
                    }}
                    className="neu-btn-secondary py-2.5 px-4 text-xs hover:scale-105 active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={unlockingVault}
                    className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{unlockingVault ? 'Verifying Password...' : 'Unlock Vault'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* UNLOCKED CONFIGURATION PANEL */
            gatewayConfig && (
              <form onSubmit={handleConfirmSaveGateway} className="space-y-6 py-1 animate-tab-fade">
                {/* Segmented Section Navigation Tabs inside Modal */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF]">
                  <button
                    type="button"
                    onClick={() => setVaultSection('bank')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      vaultSection === 'bank'
                        ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF]'
                        : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>1. Owner Bank Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVaultSection('gateway')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      vaultSection === 'gateway'
                        ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF]'
                        : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>2. Gateway & API Keys</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVaultSection('gst')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      vaultSection === 'gst'
                        ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF]'
                        : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>3. GST & Invoicing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVaultSection('stamp')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                      vaultSection === 'stamp'
                        ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF]'
                        : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>4. Digital Stamp & Sign</span>
                  </button>
                </div>

                {/* SECTION 1: WEBSITE OWNER BANK ACCOUNT */}
                {vaultSection === 'bank' && (
                  <div className="space-y-4 p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] animate-tab-fade">
                    <div>
                      <h4 className="text-xs font-display font-extrabold text-[#1F1F1F] uppercase tracking-wider">
                        Website Owner / Merchant Bank Settlement Account
                      </h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-0.5">Subscription revenue is deposited into this bank account via T+1 daily settlement.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Beneficiary / Account Holder Name *</label>
                        <input
                          type="text"
                          value={gatewayConfig.beneficiary_name || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, beneficiary_name: e.target.value })}
                          className="neu-input w-full text-xs font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Bank Name *</label>
                        <input
                          type="text"
                          value={gatewayConfig.bank_name || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, bank_name: e.target.value })}
                          placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                          className="neu-input w-full text-xs font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Account Number *</label>
                        <input
                          type="text"
                          value={gatewayConfig.account_number || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, account_number: e.target.value })}
                          className="neu-input w-full text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">IFSC Code *</label>
                        <input
                          type="text"
                          value={gatewayConfig.ifsc_code || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, ifsc_code: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFC0001234"
                          className="neu-input w-full text-xs font-mono font-bold uppercase"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Account Type *</label>
                        <select
                          value={gatewayConfig.account_type || 'CURRENT'}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, account_type: e.target.value })}
                          className="neu-input w-full text-xs font-bold"
                        >
                          <option value="CURRENT">Current Account (Business)</option>
                          <option value="SAVINGS">Savings Account</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Primary Business UPI ID / VPA *</label>
                        <input
                          type="text"
                          value={gatewayConfig.business_upi_id || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, business_upi_id: e.target.value })}
                          placeholder="e.g. owner@okhdfcbank"
                          className="neu-input w-full text-xs font-mono font-bold text-[#E86A5B]"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Bank Branch / City</label>
                        <input
                          type="text"
                          value={gatewayConfig.bank_branch || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, bank_branch: e.target.value })}
                          placeholder="e.g. Ring Road Branch, Surat, Gujarat"
                          className="neu-input w-full text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: PAYMENT GATEWAY CREDENTIALS */}
                {vaultSection === 'gateway' && (
                  <div className="space-y-4 p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] animate-tab-fade">
                    <div>
                      <h4 className="text-xs font-display font-extrabold text-[#1F1F1F] uppercase tracking-wider">
                        Payment Gateway Provider & API Keys
                      </h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-0.5">Configure live or test mode keys for Razorpay / UPI checkout.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Gateway Provider</label>
                        <select
                          value={gatewayConfig.gateway_provider || 'RAZORPAY'}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, gateway_provider: e.target.value })}
                          className="neu-input w-full text-xs font-bold"
                        >
                          <option value="RAZORPAY">Razorpay (Cards, NetBanking, UPI, GPay)</option>
                          <option value="CASHFREE">Cashfree Payments</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Environment Mode *</label>
                        <select
                          value={gatewayConfig.gateway_mode || 'TEST'}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, gateway_mode: e.target.value })}
                          className={`neu-input w-full text-xs font-bold ${gatewayConfig.gateway_mode === 'LIVE' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700'}`}
                        >
                          <option value="TEST">TEST MODE (Sandbox / Mock Checkouts)</option>
                          <option value="LIVE">LIVE MODE (Real Money Settlements)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Gateway Key ID *</label>
                        <input
                          type="text"
                          value={gatewayConfig.key_id || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, key_id: e.target.value })}
                          placeholder="rzp_live_... or rzp_test_..."
                          className="neu-input w-full text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Gateway Key Secret *</label>
                        <div className="relative">
                          <input
                            type={showVaultSecret ? 'text' : 'password'}
                            value={gatewayConfig.key_secret || ''}
                            onChange={(e) => setGatewayConfig({ ...gatewayConfig, key_secret: e.target.value })}
                            className="neu-input w-full text-xs font-mono pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowVaultSecret(!showVaultSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E8E] hover:text-[#1F1F1F]"
                          >
                            {showVaultSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Webhook Secret (for Signature Validation) *</label>
                        <input
                          type="text"
                          value={gatewayConfig.webhook_secret || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, webhook_secret: e.target.value })}
                          placeholder="whsec_..."
                          className="neu-input w-full text-xs font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: INDIAN GST & INVOICING */}
                {vaultSection === 'gst' && (
                  <div className="space-y-4 p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] animate-tab-fade">
                    <div>
                      <h4 className="text-xs font-display font-extrabold text-[#1F1F1F] uppercase tracking-wider">
                        Legal Business & Indian GST Tax Invoicing
                      </h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-0.5">Stamped on official computer-generated GST tax invoices (`GMM-2026-XXXXXX`).</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Seller Legal Entity Name *</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_legal_name || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_legal_name: e.target.value })}
                          className="neu-input w-full text-xs font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Seller GSTIN *</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_gstin || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_gstin: e.target.value.toUpperCase() })}
                          placeholder="e.g. 24AAACG1234F1Z5"
                          className="neu-input w-full text-xs font-mono font-bold uppercase"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Seller PAN Number *</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_pan || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_pan: e.target.value.toUpperCase() })}
                          placeholder="e.g. AAACG1234F"
                          className="neu-input w-full text-xs font-mono font-bold uppercase"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Seller Registered State *</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_state || 'Gujarat'}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_state: e.target.value })}
                          className="neu-input w-full text-xs font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">State Code (GST) *</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_state_code || '24'}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_state_code: e.target.value })}
                          className="neu-input w-full text-xs font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">GST Rate Percentage (%) *</label>
                        <input
                          type="number"
                          step="0.1"
                          value={gatewayConfig.gst_rate_pct || 18.0}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, gst_rate_pct: parseFloat(e.target.value) || 18.0 })}
                          className="neu-input w-full text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Billing Support Email *</label>
                        <input
                          type="email"
                          value={gatewayConfig.seller_support_email || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_support_email: e.target.value })}
                          className="neu-input w-full text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Billing Support Phone</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_support_phone || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_support_phone: e.target.value })}
                          className="neu-input w-full text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Registered Office Address *</label>
                        <input
                          type="text"
                          value={gatewayConfig.seller_address || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, seller_address: e.target.value })}
                          className="neu-input w-full text-xs font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: OFFICIAL DIGITAL STAMP & AUTHORIZED SIGNATURE */}
                {vaultSection === 'stamp' && (
                  <div className="space-y-5 p-5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] animate-tab-fade">
                    <div>
                      <h4 className="text-xs font-display font-extrabold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#E86A5B]" />
                        <span>Official Digital Stamp & Authorized Signatory Settings</span>
                      </h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                        These official legal credentials, stamp/seal, and signature will print automatically on every client & studio GST tax invoice.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                          Authorized Signatory Full Name *
                        </label>
                        <input
                          type="text"
                          value={gatewayConfig.authorized_signatory_name || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, authorized_signatory_name: e.target.value })}
                          placeholder="e.g. Aryan Patel / Founder Name"
                          className="neu-input w-full text-xs font-bold"
                          required
                        />
                        <p className="text-[10px] text-[#6B6B6B] mt-1">
                          Full legal name printed under "Authorized Signatory" on tax invoices.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                          Signatory Designation / Role *
                        </label>
                        <input
                          type="text"
                          value={gatewayConfig.authorized_signatory_designation || ''}
                          onChange={(e) => setGatewayConfig({ ...gatewayConfig, authorized_signatory_designation: e.target.value })}
                          placeholder="e.g. Managing Director & Founder"
                          className="neu-input w-full text-xs font-medium"
                          required
                        />
                        <p className="text-[10px] text-[#6B6B6B] mt-1">
                          Title or position within the registered company (e.g. Director, Partner).
                        </p>
                      </div>

                      {/* STAMP UPLOAD & URL */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[#1F1F1F]">
                            Company Round Stamp / Seal
                          </label>
                          {gatewayConfig.digital_stamp_url && (
                            <button
                              type="button"
                              onClick={() => setGatewayConfig({ ...gatewayConfig, digital_stamp_url: '' })}
                              className="text-[10px] text-rose-500 hover:underline font-bold"
                            >
                              Reset to Default Seal
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={gatewayConfig.digital_stamp_url || ''}
                            onChange={(e) => setGatewayConfig({ ...gatewayConfig, digital_stamp_url: e.target.value })}
                            placeholder="Upload PNG or paste image URL..."
                            className="neu-input flex-1 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => stampFileRef.current?.click()}
                            className="neu-btn-secondary py-2 px-3 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer hover:text-[#E86A5B]"
                            title="Upload PNG Stamp Image from your computer"
                          >
                            <UploadCloud className="w-4 h-4 text-[#E86A5B]" />
                            <span>Upload PNG</span>
                          </button>
                          <input
                            ref={stampFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('File size exceeds 2MB limit');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setGatewayConfig({ ...gatewayConfig, digital_stamp_url: reader.result as string });
                                toast.success('Official PNG Stamp loaded successfully!');
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-[#6B6B6B]">
                          💡 Upload your company round stamp PNG (transparent background recommended) or leave empty for default.
                        </p>
                      </div>

                      {/* SIGNATURE UPLOAD & URL */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[#1F1F1F]">
                            Authorized Digital Signature
                          </label>
                          {gatewayConfig.digital_signature_url && (
                            <button
                              type="button"
                              onClick={() => setGatewayConfig({ ...gatewayConfig, digital_signature_url: '' })}
                              className="text-[10px] text-rose-500 hover:underline font-bold"
                            >
                              Reset to Default Signature
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={gatewayConfig.digital_signature_url || ''}
                            onChange={(e) => setGatewayConfig({ ...gatewayConfig, digital_signature_url: e.target.value })}
                            placeholder="Upload PNG or paste signature URL..."
                            className="neu-input flex-1 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => signFileRef.current?.click()}
                            className="neu-btn-secondary py-2 px-3 text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer hover:text-[#E86A5B]"
                            title="Upload PNG Signature Image from your computer"
                          >
                            <UploadCloud className="w-4 h-4 text-[#E86A5B]" />
                            <span>Upload PNG</span>
                          </button>
                          <input
                            ref={signFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('File size exceeds 2MB limit');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () => {
                                setGatewayConfig({ ...gatewayConfig, digital_signature_url: reader.result as string });
                                toast.success('Digital Signature PNG loaded successfully!');
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-[#6B6B6B]">
                          💡 Upload your official signature PNG with transparent background or leave empty for cursive name.
                        </p>
                      </div>

                      {/* LIVE VISUAL PREVIEW OF PRINTED STAMP & SIGNATURE */}
                      <div className="sm:col-span-2 p-5 rounded-2xl bg-white border border-[#E2DDD5] shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5E2] mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                            <span>Live Invoice Stamp & Sign Preview (As Seen on Printed PDF)</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Valid Under GST Sec 31
                          </span>
                        </div>

                        <div className="flex justify-end">
                          <div className="text-right p-5 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] max-w-sm w-full">
                            <div className="font-extrabold text-xs text-[#1F1F1F]">
                              For {gatewayConfig.seller_legal_name || 'Get My Moment Media Technologies Pvt Ltd'}
                            </div>

                            <div className="flex items-center justify-end gap-4 my-3">
                              {gatewayConfig.digital_stamp_url ? (
                                <img
                                  src={gatewayConfig.digital_stamp_url}
                                  alt="Custom Seal"
                                  className="max-h-20 max-w-20 object-contain drop-shadow-sm"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '';
                                  }}
                                />
                              ) : (
                                <div className="w-16 h-16 border-2 border-dashed border-[#E86A5B] rounded-full flex flex-col items-center justify-center text-[7px] font-extrabold text-[#E86A5B] text-center uppercase -rotate-6 p-1 bg-[#E86A5B]/5 shadow-sm">
                                  <span>GET MY MOMENT</span>
                                  <span className="text-[8px] text-[#D9A441]">★ SEAL ★</span>
                                  <span>VERIFIED</span>
                                </div>
                              )}

                              {gatewayConfig.digital_signature_url ? (
                                <img
                                  src={gatewayConfig.digital_signature_url}
                                  alt="Custom Signature"
                                  className="max-h-12 max-w-32 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '';
                                  }}
                                />
                              ) : (
                                <div className="font-serif italic text-xl font-bold text-[#1F1F1F] pr-2 tracking-tight">
                                  {gatewayConfig.authorized_signatory_name || 'Aryan Patel'}
                                </div>
                              )}
                            </div>

                            <div className="border-t border-dashed border-[#8E8E8E] pt-1.5 text-xs font-bold text-[#1F1F1F]">
                              {gatewayConfig.authorized_signatory_name || 'Aryan Patel'}
                              <div className="text-[10px] text-[#6B6B6B] font-normal">
                                {gatewayConfig.authorized_signatory_designation || 'Managing Director & Founder'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTTOM AUTHORIZATION & SAVE ROW */}
                <div className="p-4 rounded-2xl bg-[#EBE8E1]/80 border border-[#E2DDD5] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                        SuperAdmin Confirmation Password *
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter SuperAdmin Password to authorize changes..."
                        className="neu-input w-full text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E2DDD5]/60">
                    <button
                      type="button"
                      onClick={() => {
                        setIsVaultUnlocked(false);
                        setGatewayConfig(null);
                        setIsVaultModalOpen(false);
                        toast.info('🔒 Vault re-locked safely.');
                      }}
                      className="neu-btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 text-[#6B6B6B]"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock & Close</span>
                    </button>

                    <button
                      type="submit"
                      disabled={savingGateway}
                      className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/25 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingGateway ? 'Saving & Locking...' : 'Save & Auto-Lock Vault'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )
          )}
        </Modal>
      )}

      {/* CONFIRM DELETE PHOTOGRAPHER DIALOG */}
      <ConfirmDialog
        isOpen={!!photographerToDelete}
        onClose={() => setPhotographerToDelete(null)}
        onConfirm={handleConfirmDeletePhotographer}
        title="Permanently Delete Studio?"
        message={`Are you sure you want to delete studio "${photographerToDelete?.studio_name}" (${photographerToDelete?.email}) and all their events and photos? This action CANNOT be undone.`}
        confirmText="Delete Studio"
        isDanger={true}
        loading={actionLoading}
      />

      {/* CONFIRM DELETE EVENT DIALOG */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDeleteEvent}
        title="Superadmin Force Delete Event?"
        message={`Are you sure you want to force delete event "${eventToDelete?.name}" created by studio "${eventToDelete?.studio_name}"?`}
        confirmText="Force Delete Event"
        isDanger={true}
        loading={actionLoading}
      />
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center font-bold text-slate-600">Loading Master Control...</div>}>
      <SuperAdminDashboardContent />
    </React.Suspense>
  );
}
