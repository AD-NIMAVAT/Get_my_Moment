'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  api, EventItem, PhotoItem, GuestLead, FinanceSummary, OperationsData,
  GuestUploadsReportResponse, GuestContributor
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NeomorphicSelect } from '@/components/NeomorphicSelect';
import { WirelessCameraModal } from '@/components/studio/WirelessCameraModal';
import { 
  Camera, QrCode, Users, ArrowLeft, UploadCloud, Copy, Check, 
  ExternalLink, Download, Sparkles, CheckCircle2, ShieldCheck, 
  IndianRupee, DollarSign, Plus, MessageSquare, Send, CheckSquare, 
  Calendar, Layers, Heart, FileText, Trash2, ToggleLeft, ToggleRight, AlertCircle, Phone, Wifi
} from 'lucide-react';

type Tab = 'operations' | 'finance' | 'photos' | 'selection' | 'guest-uploads' | 'whatsapp' | 'qr' | 'leads';

export default function EventCommandCenterPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [leads, setLeads] = useState<GuestLead[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [guestReport, setGuestReport] = useState<GuestUploadsReportResponse | null>(null);
  const [togglingGuestUploads, setTogglingGuestUploads] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>('operations');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSelection, setCopiedSelection] = useState(false);
  const [showWirelessModal, setShowWirelessModal] = useState(false);

  // Operations Modals
  const [showCeremonyModal, setShowCeremonyModal] = useState(false);
  const [newCeremonyName, setNewCeremonyName] = useState('');
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('Candid Photo');
  const [crewPayout, setCrewPayout] = useState('15000');
  const [crewPhone, setCrewPhone] = useState('');

  // Finance Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCat, setExpenseCat] = useState('VIDEO_EDITOR');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('10000');
  const [expensePaidTo, setExpensePaidTo] = useState('');

  // Delete Confirm State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Task Input
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && eventId) {
      loadAllEventData();
    }
  }, [user, authLoading, eventId, router]);

  const loadAllEventData = async () => {
    try {
      setLoading(true);
      const [eventData, photosData, leadsData, financeData, opsData, guestReportData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventPhotos(eventId),
        api.getEventLeads(eventId),
        api.getEventFinance(eventId),
        api.getEventOperations(eventId),
        api.getGuestUploadsReport(eventId).catch(() => null),
      ]);
      setEvent(eventData);
      setPhotos(photosData);
      setLeads(leadsData);
      setFinance(financeData);
      setOperations(opsData);
      setGuestReport(guestReportData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };
  // Real-Time Live Wireless Camera Ingestion & Auto-Sync Listener
  useEffect(() => {
    if (!eventId || !user) return;

    // Lock wireless camera ingest receiver to this active event
    api.getWirelessCredentials(eventId).catch(() => {});

    // Polling interval (every 2 seconds) to auto-fetch new wireless photos without manual refresh
    const interval = setInterval(async () => {
      try {
        const latestPhotos = await api.getEventPhotos(eventId);
        setPhotos((prev) => {
          if (latestPhotos.length > prev.length) {
            const newlyAdded = latestPhotos.filter(
              (lp) => !prev.some((p) => p.id === lp.id)
            );
            if (newlyAdded.length > 0) {
              const name = newlyAdded[0].original_file_name;
              toast.success(`📸 Live Wireless Photo: ${name} synced instantly!`);
            }
            return latestPhotos;
          }
          return prev;
        });
      } catch (e) {
        // silent polling catch
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [eventId, user]);

  const handleToggleGuestUploads = async () => {
    try {
      setTogglingGuestUploads(true);
      const res = await api.toggleGuestUploads(eventId);
      if (event) {
        setEvent({ ...event, allow_guest_uploads: res.allow_guest_uploads });
      }
      if (guestReport) {
        setGuestReport({ ...guestReport, allow_guest_uploads: res.allow_guest_uploads });
      }
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle guest uploads');
    } finally {
      setTogglingGuestUploads(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const fileArray = Array.from(files);
    const total = fileArray.length;
    let uploaded = 0;
    let duplicates = 0;

    setUploadProgress(`Uploading ${total} photos... (0%)`);

    try {
      const chunkSize = 4;
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = fileArray.slice(i, i + chunkSize);
        const res = await api.uploadPhotos(eventId, chunk);
        uploaded += res.uploaded_count;
        duplicates += res.duplicates_count;
        const pct = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
        setUploadProgress(`Uploaded ${uploaded + duplicates}/${total} photos (${pct}%)... AI face embeddings active`);
      }

      const updatedPhotos = await api.getEventPhotos(eventId);
      setPhotos(updatedPhotos);
      toast.success(`🎉 Ingest Complete! ${uploaded} new photo(s) indexed with 128-d AI faces.`);
      setUploadProgress(null);
    } catch (err: any) {
      toast.error(`Upload error: ${err.message || 'Failed to upload'}`);
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddCeremony = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCeremonyName.trim()) return;
    try {
      await api.addCeremony(eventId, { name: newCeremonyName.trim() });
      setShowCeremonyModal(false);
      setNewCeremonyName('');
      const updatedOps = await api.getEventOperations(eventId);
      setOperations(updatedOps);
      toast.success('Ceremony added to wedding timeline!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add ceremony');
    }
  };

  const handleAddCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewName.trim()) return;
    try {
      await api.addCrewMember(eventId, {
        name: crewName.trim(),
        role: crewRole,
        phone: crewPhone.trim() || undefined,
        payout_inr: parseFloat(crewPayout) || 0,
      });
      setShowCrewModal(false);
      setCrewName('');
      setCrewPhone('');
      const [updatedOps, updatedFin] = await Promise.all([
        api.getEventOperations(eventId),
        api.getEventFinance(eventId),
      ]);
      setOperations(updatedOps);
      setFinance(updatedFin);
      toast.success('Crew member assigned to shoot!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign crew member');
    }
  };

  const handleToggleCrewPayout = async (crewId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    try {
      await api.updateCrewPayout(eventId, crewId, nextStatus);
      const updatedOps = await api.getEventOperations(eventId);
      setOperations(updatedOps);
      toast.success(`Crew payout status updated to ${nextStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payout');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim()) return;
    try {
      await api.logEventExpense(eventId, {
        category: expenseCat,
        description: expenseDesc.trim(),
        amount_inr: parseFloat(expenseAmount) || 0,
        paid_to: expensePaidTo.trim() || undefined,
      });
      setShowExpenseModal(false);
      setExpenseDesc('');
      setExpensePaidTo('');
      const updatedFin = await api.getEventFinance(eventId);
      setFinance(updatedFin);
      toast.success('Expense recorded in profit ledger!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to log expense');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await api.addEventTask(eventId, { title: newTaskTitle.trim() });
      setNewTaskTitle('');
      const updatedOps = await api.getEventOperations(eventId);
      setOperations(updatedOps);
      toast.success('Checklist item added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add task');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      await api.toggleEventTask(eventId, taskId);
      const updatedOps = await api.getEventOperations(eventId);
      setOperations(updatedOps);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle task');
    }
  };

  const copyGuestLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.access_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Live Guest QR Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copySelectionLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/selection/${event.selection_token || event.access_token}`;
    navigator.clipboard.writeText(url);
    setCopiedSelection(true);
    toast.success('Client Album Selection link copied!');
    setTimeout(() => setCopiedSelection(false), 2000);
  };

  const triggerWhatsApp = (type: 'BOOKING' | 'PAYMENT' | 'QR_GUEST' | 'SELECTION') => {
    if (!event) return;
    const phone = event.client_phone ? event.client_phone.replace(/[^0-9]/g, '') : '';
    const phoneWithCode = phone.startsWith('91') ? phone : `91${phone}`;
    const guestUrl = `${window.location.origin}/e/${event.access_token}`;
    const selectionUrl = `${window.location.origin}/selection/${event.selection_token || event.access_token}`;

    let msg = '';
    if (type === 'BOOKING') {
      msg = `*${user?.studio_name} - Booking Confirmation* 📸\n\nDear ${event.client_name || 'Client'},\n\nWe are delighted to confirm your photography booking for *${event.name}*!\n\nContract Value: *₹${(finance?.package_amount_inr || 0).toLocaleString('en-IN')}*\nAdvance Received: *₹${(finance?.total_received_inr || 0).toLocaleString('en-IN')}*\n\nOur team is prepared to capture your most memorable moments!`;
    } else if (type === 'PAYMENT') {
      msg = `*${user?.studio_name} - Payment Milestone Reminder* 💳\n\nDear ${event.client_name || 'Client'},\n\nThis is a friendly reminder regarding your pending balance of *₹${(finance?.total_pending_inr || 0).toLocaleString('en-IN')}* for *${event.name}*.\n\nYou may pay via UPI to our studio account.\n\nThank you for choosing ${user?.studio_name}!`;
    } else if (type === 'QR_GUEST') {
      msg = `*Live Event Photos - Instant AI Face Match* ✨\n\nWelcome to *${event.name}*!\n\nFind all your personal photos in seconds by scanning the QR code or clicking here:\n👉 ${guestUrl}\n\nJust take a selfie to receive your high-res photos instantly!\n- Hosted by ${user?.studio_name}`;
    } else if (type === 'SELECTION') {
      msg = `*Wedding Album Photo Selection Portal* 📖\n\nDear ${event.client_name || 'Couple'},\n\nYour high-resolution photos for *${event.name}* are ready for album selection!\n\nPlease review, mark your favorites (❤️), and submit your album selection here:\n👉 ${selectionUrl}\n\nWarm regards,\n${user?.studio_name}`;
    }

    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
    toast.info('WhatsApp window opened with formatted proposal!');
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteEvent(eventId);
      toast.success(`Event "${event?.name}" deleted successfully`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
      setDeleting(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <div className="h-28 rounded-3xl skeleton-shimmer" />
          <div className="h-16 rounded-2xl skeleton-shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 rounded-2xl skeleton-shimmer" />
            <div className="h-32 rounded-2xl skeleton-shimmer" />
            <div className="h-32 rounded-2xl skeleton-shimmer" />
            <div className="h-32 rounded-2xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const guestUrl = typeof window !== 'undefined' ? `${window.location.origin}/e/${event.access_token}` : `/e/${event.access_token}`;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Back Link */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xs text-[#6B6B6B] hover:text-[#E86A5B] inline-flex items-center gap-1.5 transition-colors font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Studio Dashboard</span>
        </Link>
        <Link
          href="/dashboard/crm"
          className="text-xs text-[#E86A5B] hover:text-[#C94F43] inline-flex items-center gap-1.5 transition-colors font-bold"
        >
          <span>Leads & CRM Pipeline →</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E8E5E2]">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] tracking-tight">{event.name}</h1>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#3FA66B] border border-emerald-200">
              {event.status}
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1.5 font-normal">
            Client: <strong className="text-[#1F1F1F]">{event.client_name || 'Direct Studio Client'}</strong> • Public Token: <code className="text-[#E86A5B] font-mono bg-[#E86A5B]/10 px-2 py-0.5 rounded border border-[#E86A5B]/20 font-bold">{event.access_token}</code>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowWirelessModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>Connect Wireless Camera (Wi-Fi)</span>
          </button>
          <button
            onClick={copyGuestLink}
            className="px-4 py-2.5 rounded-xl border border-[#E8E5E2] hover:bg-neutral-50 text-[#1F1F1F] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3FA66B]" /> : <Copy className="w-3.5 h-3.5 text-[#6B6B6B]" />}
            <span>{copied ? 'Copied QR URL' : 'Copy Guest QR Link'}</span>
          </button>
          <a
            href={guestUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary py-2.5 px-4 text-xs"
          >
            <span>Live Guest Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3.5 py-2.5 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Permanently Delete Event"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Event</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-[#E8E5E2] my-6 -mx-4 px-4 sm:mx-0 sm:px-0 touch-action-manipulation">
        {[
          { id: 'operations', label: 'Command Center & Operations', icon: Layers },
          { id: 'finance', label: 'Profit & Invoicing', icon: IndianRupee },
          { id: 'photos', label: `Studio Photos (${photos.filter(p => !p.is_guest_uploaded).length})`, icon: Camera },
          { id: 'guest-uploads', label: `Guest Uploads (${guestReport?.total_guest_photos || 0})`, icon: UploadCloud },
          { id: 'selection', label: 'Album Proofing Portal', icon: Heart },
          { id: 'whatsapp', label: 'WhatsApp Automation', icon: MessageSquare },
          { id: 'qr', label: 'QR Standee', icon: QrCode },
          { id: 'leads', label: `Guest Leads (${leads.length})`, icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]' 
                  : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Command Center & Operations */}
      {activeTab === 'operations' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase">Functions / Ceremonies</span>
              <div className="text-2xl font-extrabold text-[#1F1F1F] mt-1">{operations?.ceremonies.length || 0}</div>
            </div>
            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase">Assigned Crew</span>
              <div className="text-2xl font-extrabold text-[#D9A441] mt-1">{operations?.crew_members.length || 0}</div>
            </div>
            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase">Indexed Photos</span>
              <div className="text-2xl font-extrabold text-[#E86A5B] mt-1">{photos.length}</div>
            </div>
            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase">Task Completion</span>
              <div className="text-2xl font-extrabold text-[#3FA66B] mt-1">
                {operations?.tasks.filter((t) => t.is_completed).length} / {operations?.tasks.length || 0}
              </div>
            </div>
          </div>

          {/* Ceremonies Timeline */}
          <div className="neu-card p-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Event Ceremonies & Functions</h3>
                <p className="text-xs text-[#6B6B6B]">Multi-day wedding timeline (Haldi, Mehendi, Sangeet, Wedding, Reception).</p>
              </div>
              <button
                onClick={() => setShowCeremonyModal(true)}
                className="btn-primary py-2 px-3.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ceremony</span>
              </button>
            </div>

            {operations?.ceremonies.length === 0 ? (
              <div className="p-8 text-center bg-[#EBE8E1] rounded-2xl shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] text-xs text-[#6B6B6B]">
                No ceremonies defined yet. Add functions like Haldi, Sangeet, or Reception.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {operations?.ceremonies.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF]">
                    <span className="text-xs font-bold text-[#1F1F1F] block">{c.name}</span>
                    <span className="text-[11px] text-[#6B6B6B] mt-1 block">{c.photo_count} Photos Assigned</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Crew & Payouts */}
          <div className="neu-card p-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Crew Members & Agreed Payouts</h3>
                <p className="text-xs text-[#6B6B6B]">Track photographer roles, contact details, and payout settlement status.</p>
              </div>
              <button
                onClick={() => setShowCrewModal(true)}
                className="btn-primary py-2 px-3.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Crew Member</span>
              </button>
            </div>

            {operations?.crew_members.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F7] rounded-2xl border border-dashed border-[#E8E5E2] text-xs text-[#6B6B6B]">
                No crew assigned yet. Add candid photographers, drone pilots, and cinematographers.
              </div>
            ) : (
              <div className="space-y-3">
                {operations?.crew_members.map((cr) => (
                  <div key={cr.id} className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-[#1F1F1F] block">{cr.name} ({cr.role})</span>
                      {cr.phone && <span className="text-[11px] text-[#6B6B6B]">{cr.phone}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#1F1F1F]">₹{cr.payout_inr.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => handleToggleCrewPayout(cr.id, cr.payout_status)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border ${
                          cr.payout_status === 'PAID'
                            ? 'bg-emerald-50 text-[#3FA66B] border-emerald-200'
                            : 'bg-amber-50 text-[#D99A2B] border-amber-200'
                        }`}
                      >
                        {cr.payout_status === 'PAID' ? '✓ Settled' : 'Pending'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Finance & Profitability */}
      {activeTab === 'finance' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="neu-card p-6">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase">Contract Package</span>
              <div className="text-3xl font-extrabold text-[#1F1F1F] mt-2">
                ₹{(finance?.package_amount_inr || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="neu-card p-6">
              <span className="text-xs font-bold text-[#6B6B6B] uppercase">Expenses & Payouts</span>
              <div className="text-3xl font-extrabold text-rose-600 mt-2">
                ₹{(finance?.total_expenses_inr || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="neu-card p-6 border-2 border-[#3FA66B]/50">
              <span className="text-xs font-bold text-[#3FA66B] uppercase">Real Net Profit ({finance?.profit_margin_pct || 0}%)</span>
              <div className="text-3xl font-extrabold text-[#3FA66B] mt-2">
                ₹{(finance?.net_profit_inr || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="neu-card p-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Logged Expenses</h3>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="btn-primary py-2 px-3.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Expense</span>
              </button>
            </div>

            {finance?.expenses.length === 0 ? (
              <div className="p-8 text-center bg-[#EBE8E1] rounded-2xl shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] text-xs text-[#6B6B6B]">
                No expenses logged yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {finance?.expenses.map((ex) => (
                  <div key={ex.id} className="p-3.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1F1F1F] block">{ex.description}</span>
                      <span className="text-[11px] text-[#6B6B6B]">{ex.category} {ex.paid_to ? `• Paid to: ${ex.paid_to}` : ''}</span>
                    </div>
                    <span className="text-xs font-bold text-rose-600">₹{ex.amount_inr.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Photos & Ingest */}
      {activeTab === 'photos' && (
        <div className="space-y-8">
          {/* Uploader Box */}
          <div className="neu-card p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] text-[#E86A5B] flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Upload Event Photos</h3>
            <p className="text-xs text-[#6B6B6B] mt-1 max-w-md mx-auto">
              Drag & drop JPEG/PNG images or click to select multiple camera files. Automated AI face indexing will run in background.
            </p>

            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="photo-upload-input"
            />
            <label
              htmlFor="photo-upload-input"
              className="mt-6 btn-primary inline-flex"
            >
              {uploading ? 'Processing & Indexing AI Faces...' : 'Select Photos to Upload'}
            </label>

            {uploadProgress && (
              <div className="mt-4 p-3 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] text-xs font-bold text-[#E86A5B]">
                {uploadProgress}
              </div>
            )}
          </div>

          {/* Gallery Header & Bulk Download Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 neu-card p-5">
            <div>
              <h4 className="text-sm font-extrabold text-[#1F1F1F] flex items-center gap-2">
                <span>Studio Photos Gallery</span>
                <span className="px-2 py-0.5 rounded-full bg-[#EBE8E1] text-[#E86A5B] text-xs font-bold shadow-[inset_1px_1px_3px_#D1CDC4,inset_-1px_-1px_3px_#FFFFFF]">
                  {photos.filter(p => !p.is_guest_uploaded).length} Photos
                </span>
              </h4>
              <p className="text-xs text-[#6B6B6B] mt-0.5">High-resolution camera captures indexed with 128-d AI face recognition.</p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <a
                href={api.getDownloadAllZipUrl(eventId, 'studio')}
                download={`${event?.name || 'Event'}_Studio_Photos.zip`}
                className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-2 w-full sm:w-auto shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download All (.ZIP)</span>
              </a>
            </div>
          </div>

          {/* Photo Grid with Single Download Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {photos.filter(p => !p.is_guest_uploaded).map((ph) => (
              <div key={ph.id} className="aspect-square rounded-2xl overflow-hidden neu-card relative group border border-white/60">
                <img
                  src={api.getThumbnailUrl(ph.id)}
                  alt={ph.original_file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('/download')) {
                      target.src = api.getDownloadUrl(ph.id);
                    }
                  }}
                />

                {/* Hover Action Overlay with Single Download Button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5">
                  <div className="flex justify-end">
                    <a
                      href={api.getDownloadUrl(ph.id)}
                      download={ph.original_file_name}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-[#1F1F1F] flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                      title="Download High-Res Original"
                    >
                      <Download className="w-3.5 h-3.5 text-[#E86A5B]" />
                    </a>
                  </div>
                  <div className="truncate text-[10px] text-white/90 font-medium">
                    {ph.original_file_name}
                  </div>
                </div>

                {ph.faces_detected_count > 0 && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#E86A5B]/90 text-white text-[10px] font-bold flex items-center gap-1 shadow group-hover:hidden">
                    <Sparkles className="w-3 h-3" />
                    <span>{ph.faces_detected_count}</span>
                  </div>
                )}
                {ph.uploaded_by_guest_name?.includes('[WIRELESS') && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold flex items-center gap-1 shadow group-hover:hidden">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>Wi-Fi Cam</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Guest Community Uploads Inspector & Studio Control */}
      {activeTab === 'guest-uploads' && (
        <div className="space-y-6">
          {/* Studio Rights / Toggle Card */}
          <div className="neu-card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white shadow-sm">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Guest Upload Permissions</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  event?.allow_guest_uploads 
                    ? 'bg-emerald-50 text-[#3FA66B] border border-emerald-200' 
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {event?.allow_guest_uploads ? '🟢 ENABLED' : '🔴 DISABLED'}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] max-w-2xl leading-relaxed">
                Studio Rights: When enabled, guests scanning the QR code can upload candid photos & selfies from their phones. Turn this off if you only want studio-curated photos in this event.
              </p>
            </div>

            <button
              onClick={handleToggleGuestUploads}
              disabled={togglingGuestUploads}
              className={`py-3 px-5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                event?.allow_guest_uploads
                  ? 'bg-[#EBE8E1] text-[#E86A5B] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] hover:text-rose-600'
                  : 'btn-primary'
              }`}
            >
              {event?.allow_guest_uploads ? (
                <>
                  <ToggleRight className="w-4 h-4 text-[#3FA66B]" />
                  <span>Disable Guest Uploads</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-white" />
                  <span>Enable Guest Uploads</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase block">Total Guest Photos</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#E86A5B] mt-1">{guestReport?.total_guest_photos || 0}</div>
              <span className="text-[10px] text-[#6B6B6B]">Auto-indexed by AI face engine</span>
            </div>

            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase block">Guest Contributors</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] mt-1">{guestReport?.contributors_count || 0}</div>
              <span className="text-[10px] text-[#3FA66B] font-bold">Unique guests uploaded</span>
            </div>

            <div className="neu-card p-5">
              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase block">Public Guest QR Link</span>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={guestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="neu-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Guest View</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contributors & Uploaded Photos Breakdown */}
          {(!guestReport || guestReport.contributors.length === 0) ? (
            <div className="neu-card p-8 sm:p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] text-[#8E8E8E] flex items-center justify-center mx-auto mb-3 shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-display font-extrabold text-[#1F1F1F]">No Guest Uploads Yet</h3>
              <p className="text-xs text-[#6B6B6B] mt-1 max-w-sm mx-auto leading-relaxed">
                When wedding guests scan your QR code and upload photos from their phones, their names, mobile numbers, and photos will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h4 className="text-sm font-display font-extrabold text-[#1F1F1F]">
                  Guest Contributor Breakdown ({guestReport.contributors.length} Guests)
                </h4>
                <a
                  href={api.getDownloadAllZipUrl(eventId, 'guest')}
                  download={`${event?.name || 'Event'}_Guest_Community_Photos.zip`}
                  className="btn-primary py-2 px-3.5 text-xs flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download All Guest Photos (.ZIP)</span>
                </a>
              </div>

              {guestReport.contributors.map((c, idx) => (
                <div key={idx} className="neu-card p-6 sm:p-7 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2DDD5]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B]/20 to-[#C94F43]/30 flex items-center justify-center text-[#E86A5B] font-bold shadow-sm">
                        {c.guest_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1F1F1F]">{c.guest_name}</span>
                          <span className="neu-pill text-[10px] font-bold text-[#E86A5B]">
                            {c.photo_count} Photos
                          </span>
                        </div>
                        {c.guest_phone && c.guest_phone !== 'N/A' && (
                          <span className="text-xs text-[#6B6B6B] flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-[#3FA66B]" />
                            <span>{c.guest_phone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-[#8E8E8E] block">
                        Uploaded: {new Date(c.latest_upload).toLocaleDateString()} at {new Date(c.latest_upload).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Contributor's Photos Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {c.photos.map((p) => (
                      <div key={p.id} className="aspect-square rounded-2xl overflow-hidden neu-card relative group border border-white/60">
                        <img
                          src={api.getThumbnailUrl(p.id)}
                          alt={p.original_file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <a
                          href={api.getDownloadUrl(p.id)}
                          download={p.original_file_name}
                          className="absolute bottom-1.5 right-1.5 p-1.5 rounded-xl bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#E86A5B]"
                          title="Download photo"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Album Selection */}
      {activeTab === 'selection' && (
        <div className="p-8 rounded-3xl neu-card text-center">
          <Heart className="w-12 h-12 text-[#E86A5B] mx-auto mb-3" />
          <h2 className="text-2xl font-display font-extrabold text-[#1F1F1F]">Client Album Proofing Suite</h2>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-2 max-w-xl mx-auto">
            Clients can access their private proofing album to heart favorites, leave custom retouch instructions, and finalize choices for photobook printing.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={copySelectionLink}
              className="btn-primary"
            >
              {copiedSelection ? 'Copied Client Link ✓' : 'Copy Client Proofing Link'}
            </button>
            <a
              href={`${window.location.origin}/selection/${event.selection_token || event.access_token}`}
              target="_blank"
              rel="noreferrer"
              className="neu-btn-secondary"
            >
              Open Proofing Preview
            </a>
          </div>
        </div>
      )}

      {/* TAB 5: WhatsApp Automation */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="neu-card p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#E86A5B] uppercase neu-pill mb-2">BOOKING STAGE</span>
              <h4 className="text-base font-bold text-[#1F1F1F] mt-1">Booking Confirmation Message</h4>
              <p className="text-xs text-[#6B6B6B] mt-2">Sends contract amount and advance received details to the client.</p>
            </div>
            <button
              onClick={() => triggerWhatsApp('BOOKING')}
              className="mt-6 btn-primary text-xs w-full"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Confirmation</span>
            </button>
          </div>

          <div className="card-elevated p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#D9A441] uppercase">PAYMENT STAGE</span>
              <h4 className="text-base font-bold text-[#1F1F1F] mt-1">Payment Balance Reminder</h4>
              <p className="text-xs text-[#6B6B6B] mt-2">Sends friendly balance reminder with exact pending amount.</p>
            </div>
            <button
              onClick={() => triggerWhatsApp('PAYMENT')}
              className="mt-6 btn-secondary-gold text-xs w-full"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Payment Reminder</span>
            </button>
          </div>

          <div className="card-elevated p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#3FA66B] uppercase">GUEST AI PORTAL</span>
              <h4 className="text-base font-bold text-[#1F1F1F] mt-1">Guest QR & Selfie Match</h4>
              <p className="text-xs text-[#6B6B6B] mt-2">Share live guest selfie search link to family broadcast groups.</p>
            </div>
            <button
              onClick={() => triggerWhatsApp('QR_GUEST')}
              className="mt-6 btn-primary text-xs w-full"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share Guest QR Link</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: QR Standee */}
      {activeTab === 'qr' && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white border border-[#E8E5E2] text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#E86A5B]/10 text-[#E86A5B] flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-[#1F1F1F] mb-1.5">Event Guest QR Code</h2>
          <p className="text-xs text-[#6B6B6B] mb-6">
            Display this QR standee at table tents or reception kiosks for instant guest selfie matching.
          </p>

          <div className="p-6 bg-white rounded-3xl inline-block shadow-lg mb-6 border-2 border-[#E86A5B]/20">
            <img src={api.getQRUrl(event.id)} alt={`QR for ${event.name}`} className="w-56 h-56 mx-auto object-contain" />
          </div>

          <div className="flex items-center justify-center gap-3">
            <a
              href={api.getQRUrl(event.id)}
              download={`QR_${event.slug}.png`}
              className="btn-primary"
            >
              Download Printable PNG
            </a>
          </div>
        </div>
      )}

      {/* TAB 7: Guest Leads */}
      {activeTab === 'leads' && (
        <div className="overflow-hidden rounded-3xl border border-[#E8E5E2] bg-white shadow-sm">
          <div className="p-6 border-b border-[#E8E5E2] flex items-center justify-between">
            <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Marketing Leads & Delivery Records</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
              {leads.length} Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E5E2] text-left text-xs">
              <thead className="bg-[#FAF9F7] text-[#6B6B6B] font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Guest Name</th>
                  <th className="px-5 py-3.5">Mobile Number</th>
                  <th className="px-5 py-3.5">Biometric Consent</th>
                  <th className="px-5 py-3.5">Marketing Consent</th>
                  <th className="px-5 py-3.5">Matches Found</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5E2] text-[#1F1F1F]">
                {leads.map((l) => (
                  <tr key={l.guest_id}>
                    <td className="px-5 py-4 font-bold text-[#1F1F1F]">{l.name}</td>
                    <td className="px-5 py-4 font-mono">{l.mobile}</td>
                    <td className="px-5 py-4 text-[#3FA66B] font-bold">{l.face_search_consent ? 'Consented ✓' : 'No'}</td>
                    <td className="px-5 py-4 text-[#E86A5B] font-bold">{l.marketing_consent ? 'Opted In ✓' : 'Opted Out'}</td>
                    <td className="px-5 py-4 font-bold text-[#1F1F1F]">{l.searches_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CEREMONY MODAL */}
      <Modal
        isOpen={showCeremonyModal}
        onClose={() => setShowCeremonyModal(false)}
        title="Add Ceremony / Function"
        subtitle="Add wedding timeline functions like Haldi, Sangeet, or Reception."
        icon={<Calendar className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleAddCeremony} className="space-y-4">
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Ceremony Name *</label>
            <input
              type="text"
              required
              value={newCeremonyName}
              onChange={(e) => setNewCeremonyName(e.target.value)}
              placeholder="e.g. Haldi Ceremony, Sangeet Night"
              className="gmm-input w-full"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5E2]">
            <button type="button" onClick={() => setShowCeremonyModal(false)} className="px-4 py-2.5 text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F]">Cancel</button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-xs font-bold">Add Ceremony</button>
          </div>
        </form>
      </Modal>

      {/* CREW MODAL */}
      <Modal
        isOpen={showCrewModal}
        onClose={() => setShowCrewModal(false)}
        title="Assign Crew Member"
        subtitle="Assign photographers, drone pilots, and editors with agreed payouts."
        icon={<Users className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleAddCrew} className="space-y-4">
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Crew / Freelancer Name *</label>
            <input
              type="text"
              required
              value={crewName}
              onChange={(e) => setCrewName(e.target.value)}
              placeholder="e.g. Amit Photography"
              className="gmm-input w-full"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Role</label>
              <NeomorphicSelect
                value={crewRole}
                onChange={setCrewRole}
                options={[
                  { value: 'Candid Photo', label: 'Candid Photo' },
                  { value: 'Traditional Photo', label: 'Traditional Photo' },
                  { value: 'Cinematographer', label: 'Cinematographer' },
                  { value: 'Drone Pilot', label: 'Drone Pilot' },
                  { value: 'Video Editor', label: 'Video Editor' },
                ]}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Agreed Payout (₹)</label>
              <input
                type="number"
                value={crewPayout}
                onChange={(e) => setCrewPayout(e.target.value)}
                className="gmm-input font-mono w-full"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DDD5]">
            <button type="button" onClick={() => setShowCrewModal(false)} className="px-4 py-2.5 text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F]">Cancel</button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-xs font-bold">Assign Crew</button>
          </div>
        </form>
      </Modal>

      {/* EXPENSE MODAL */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Log Event Expense"
        subtitle="Record expenses like album printing, editor payouts, and travel."
        icon={<IndianRupee className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Category</label>
            <NeomorphicSelect
              value={expenseCat}
              onChange={setExpenseCat}
              options={[
                { value: 'VIDEO_EDITOR', label: 'Video Editor' },
                { value: 'ALBUM_PRINTING', label: 'Album Printing / Silk Photo Books' },
                { value: 'TRAVEL_HOTEL', label: 'Travel & Hotel Stay' },
                { value: 'EQUIPMENT_RENTAL', label: 'Equipment / Lens Rental' },
                { value: 'MISC', label: 'Miscellaneous Expense' },
              ]}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Description *</label>
            <input
              type="text"
              required
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="e.g. 2 Leather Albums 30x40"
              className="gmm-input w-full"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Amount (₹ INR) *</label>
            <input
              type="number"
              required
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="gmm-input font-mono w-full"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5E2]">
            <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2.5 text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F]">Cancel</button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-xs font-bold">Save Expense</button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE EVENT DIALOG */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Permanently Delete Event?"
        message={`Are you sure you want to delete "${event?.name}" and all associated photos, faces, and leads? This action CANNOT be undone.`}
        confirmText="Delete Event"
        isDanger={true}
        loading={deleting}
      />

      {/* WIRELESS CAMERA WI-FI SYNC MODAL */}
      {event && (
        <WirelessCameraModal
          isOpen={showWirelessModal}
          onClose={() => setShowWirelessModal(false)}
          eventId={event.id}
          eventName={event.name}
          accessToken={event.access_token}
          onPhotoIngested={loadAllEventData}
        />
      )}
    </div>
  );
}
