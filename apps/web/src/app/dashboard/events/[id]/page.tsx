'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  api, EventItem, PhotoItem, GuestLead, FinanceSummary, OperationsData,
  GuestUploadsReportResponse, GuestContributor, FolderItem, EventHealthData
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
  Calendar, Layers, Heart, FileText, Trash2, ToggleLeft, ToggleRight, 
  AlertCircle, Phone, Wifi, Folder as FolderIcon, FolderPlus, MoveRight,
  Lock, Eye, MoreVertical, X, Activity, Clock, Zap
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
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  
  const [leads, setLeads] = useState<GuestLead[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [guestReport, setGuestReport] = useState<GuestUploadsReportResponse | null>(null);
  const [health, setHealth] = useState<EventHealthData | null>(null);
  const [togglingGuestUploads, setTogglingGuestUploads] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>('operations');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedSelection, setCopiedSelection] = useState(false);
  const [showWirelessModal, setShowWirelessModal] = useState(false);

  // Folder Modals & Actions
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState('CEREMONY');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetMoveFolderId, setTargetMoveFolderId] = useState('');
  const [generatingPresets, setGeneratingPresets] = useState(false);

  // Operations Modals
  const [showCeremonyModal, setShowCeremonyModal] = useState(false);
  const [newCeremonyName, setNewCeremonyName] = useState('');
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('Candid Photo');
  const [crewPayout, setCrewPayout] = useState('15000');
  const [crewPhone, setCrewPhone] = useState('');
  const [crewAssignedCeremonies, setCrewAssignedCeremonies] = useState<string[]>([]);
  const [crewCameraTag, setCrewCameraTag] = useState('');

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
      const [eventData, photosData, leadsData, financeData, opsData, guestReportData, foldersData, healthData] = await Promise.all([
        api.getEvent(eventId),
        api.getEventPhotos(eventId),
        api.getEventLeads(eventId),
        api.getEventFinance(eventId),
        api.getEventOperations(eventId),
        api.getGuestUploadsReport(eventId).catch(() => null),
        api.getFolders(eventId).catch(() => []),
        api.getEventHealth(eventId).catch(() => null),
      ]);
      setEvent(eventData);
      setPhotos(photosData);
      setLeads(leadsData);
      setFinance(financeData);
      setOperations(opsData);
      setGuestReport(guestReportData);
      setFolders(foldersData);
      setHealth(healthData);
      if (foldersData.length > 0 && !uploadTargetFolderId) {
        setUploadTargetFolderId(foldersData[0].id);
      }
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

    // Polling interval (every 2.5 seconds)
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
              // Also refresh folders for updated counters
              api.getFolders(eventId).then(setFolders).catch(() => {});
            }
            return latestPhotos;
          }
          return prev;
        });
      } catch (e) {
        // silent polling catch
      }
    }, 2500);

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
        const res = await api.uploadPhotos(eventId, chunk, uploadTargetFolderId || undefined);
        uploaded += res.uploaded_count;
        duplicates += res.duplicates_count;
        const pct = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
        setUploadProgress(`Uploaded ${uploaded + duplicates}/${total} photos (${pct}%)... AI face embeddings active`);
      }

      const [updatedPhotos, updatedFolders] = await Promise.all([
        api.getEventPhotos(eventId),
        api.getFolders(eventId),
      ]);
      setPhotos(updatedPhotos);
      setFolders(updatedFolders);
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

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(eventId, {
        name: newFolderName.trim(),
        folder_type: newFolderType,
      });
      setShowFolderModal(false);
      setNewFolderName('');
      const updatedFolders = await api.getFolders(eventId);
      setFolders(updatedFolders);
      toast.success(`📁 Folder created successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create folder');
    }
  };

  const handleGenerateWeddingFolders = async () => {
    try {
      setGeneratingPresets(true);
      const generated = await api.generateWeddingFolders(eventId);
      setFolders(generated);
      toast.success('✨ Standard Wedding Ceremony Folders generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate wedding folders');
    } finally {
      setGeneratingPresets(false);
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Delete folder "${folderName}"? Photos inside will be safely moved to Uncategorized.`)) return;
    try {
      await api.deleteFolder(eventId, folderId, 'MOVE_TO_UNCATEGORIZED');
      const [updatedFolders, updatedPhotos] = await Promise.all([
        api.getFolders(eventId),
        api.getEventPhotos(eventId),
      ]);
      setFolders(updatedFolders);
      setPhotos(updatedPhotos);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      toast.success(`Folder "${folderName}" deleted. Photos relocated.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete folder');
    }
  };

  const handleTogglePhotoSelect = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPhotos = () => {
    const current = displayedPhotos.map(p => p.id);
    setSelectedPhotoIds(new Set(current));
  };

  const handleClearSelection = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleMoveSelectedPhotos = async () => {
    if (!targetMoveFolderId || selectedPhotoIds.size === 0) return;
    try {
      const res = await api.movePhotosToFolder(eventId, Array.from(selectedPhotoIds), targetMoveFolderId);
      setShowMoveModal(false);
      setSelectedPhotoIds(new Set());
      const [updatedFolders, updatedPhotos] = await Promise.all([
        api.getFolders(eventId),
        api.getEventPhotos(eventId),
      ]);
      setFolders(updatedFolders);
      setPhotos(updatedPhotos);
      toast.success(`Moved ${res.moved_count} photo(s) successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to move photos');
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
        assigned_ceremonies: crewAssignedCeremonies,
        camera_tag: crewCameraTag.trim() || undefined,
      });
      setShowCrewModal(false);
      setCrewName('');
      setCrewPhone('');
      setCrewCameraTag('');
      setCrewAssignedCeremonies([]);
      const [updatedOps, updatedFin] = await Promise.all([
        api.getEventOperations(eventId),
        api.getEventFinance(eventId),
      ]);
      setOperations(updatedOps);
      setFinance(updatedFin);
      toast.success('🎉 Crew member assigned with ceremonies & camera tag!');
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
      toast.success('Expense recorded in project ledger!');
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
      toast.success('Deliverable task added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add task');
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await api.toggleEventTask(eventId, taskId, !isCompleted);
      const updatedOps = await api.getEventOperations(eventId);
      setOperations(updatedOps);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const handleCopyGuestLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.access_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Guest QR Selfie link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySelectionLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/selection/${event.selection_token}`;
    navigator.clipboard.writeText(url);
    setCopiedSelection(true);
    toast.success('Client Album Proofing link copied to clipboard!');
    setTimeout(() => setCopiedSelection(false), 2000);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await api.deleteEvent(eventId);
      toast.success(`Event "${event?.name}" deleted successfully.`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center p-4">
        <div className="neu-flat p-8 rounded-3xl text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-[#E86A5B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#1F1F1F]">Loading Event Studio OS...</p>
        </div>
      </div>
    );
  }

  const displayedPhotos = photos
    .filter(p => !p.is_guest_uploaded)
    .filter(p => selectedFolderId ? p.folder_id === selectedFolderId : true);

  const hasWeddingFolders = folders.some(f => f.name.includes('Haldi') || f.name.includes('Wedding'));

  return (
    <div className="min-h-screen bg-[#F3F1EC] pb-24">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="border-b border-[#E2DDD5] bg-[#F3F1EC]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="neu-button-sm p-2 rounded-xl text-[#6B6B6B] hover:text-[#1F1F1F] flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-[#1F1F1F] tracking-tight truncate max-w-md">
                  {event?.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
                  {event?.status}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                {event?.client_name ? `Client: ${event.client_name} • ` : ''}
                {event?.venue ? `${event.venue}, ${event.city || ''}` : 'Wedding Event'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowWirelessModal(true)}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 shadow-sm text-emerald-700 hover:text-emerald-800 border-emerald-300"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Camera Wi-Fi</span>
            </button>

            <button
              onClick={handleCopyGuestLink}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <QrCode className="w-3.5 h-3.5 text-[#E86A5B]" />}
              <span>{copied ? 'Copied QR Link' : 'Guest QR Link'}</span>
            </button>

            <button
              onClick={handleCopySelectionLink}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 shadow-sm"
            >
              {copiedSelection ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Heart className="w-3.5 h-3.5 text-rose-500" />}
              <span>Proofing Portal</span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
              title="Delete Event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Live Ingest & AI Pipeline Telemetry Panel */}
        {health && (
          <div className="p-4 sm:p-5 rounded-3xl neu-card bg-[#FAF9F7] border border-[#E8E5E2] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                health.pipeline_health === 'HEALTHY' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                health.pipeline_health === 'PROCESSING' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                health.pipeline_health === 'BACKLOG' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                'bg-rose-50 text-rose-600 border border-rose-200'
              }`}>
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-extrabold text-[#1F1F1F]">
                    Live AI Ingest &amp; Pipeline Telemetry
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    health.pipeline_health === 'HEALTHY' ? 'bg-emerald-100 text-emerald-800' :
                    health.pipeline_health === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                    health.pipeline_health === 'BACKLOG' ? 'bg-amber-100 text-amber-900' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {health.pipeline_health.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6B6B]">
                  Queue: {health.queue_depth} pending • {health.photos_ready} of {health.photos_total} photos guest-ready
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full md:w-auto text-xs">
              <div className="neu-pill px-3 py-1.5 flex items-center gap-1.5 text-[11px] text-[#1F1F1F]">
                <Clock className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Avg AI: <strong>{health.avg_processing_duration_ms !== null && health.avg_processing_duration_ms !== undefined ? `${health.avg_processing_duration_ms}ms` : 'N/A'}</strong></span>
                {health.p95_processing_duration_ms !== null && health.p95_processing_duration_ms !== undefined && (
                  <span className="text-[10px] text-[#6B6B6B]">(p95: {health.p95_processing_duration_ms}ms)</span>
                )}
              </div>

              {health.photos_failed > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{health.photos_failed} Failed</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'operations', label: 'Operations & Crew', icon: <Users className="w-4 h-4" /> },
            { id: 'finance', label: 'Finance & Profit', icon: <IndianRupee className="w-4 h-4" /> },
            { id: 'photos', label: `Photos & Folders (${photos.filter(p => !p.is_guest_uploaded).length})`, icon: <Camera className="w-4 h-4" /> },
            { id: 'guest-uploads', label: `Guest Uploads (${photos.filter(p => p.is_guest_uploaded).length})`, icon: <UploadCloud className="w-4 h-4" /> },
            { id: 'selection', label: 'Album Proofing', icon: <Heart className="w-4 h-4" /> },
            { id: 'qr', label: 'Event QR Flyer', icon: <QrCode className="w-4 h-4" /> },
            { id: 'leads', label: `Guest Leads (${leads.length})`, icon: <Users className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#E86A5B] text-white shadow-md'
                  : 'neu-button text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB: Photos & Folders Master Management */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Folder Navigation Bar & Preset Actions */}
            <div className="neu-card p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-display font-extrabold text-[#1F1F1F] flex items-center gap-2">
                    <FolderIcon className="w-5 h-5 text-[#E86A5B]" />
                    <span>Ceremony & Event Folders</span>
                  </h3>
                  <p className="text-xs text-[#6B6B6B]">Organize wedding photos by ceremony functions and manage client/guest view settings.</p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {!hasWeddingFolders && (
                    <button
                      onClick={handleGenerateWeddingFolders}
                      disabled={generatingPresets}
                      className="btn-secondary py-2 px-3.5 text-xs flex items-center gap-1.5 text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>{generatingPresets ? 'Generating...' : '✨ Generate Wedding Folders'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowFolderModal(true)}
                    className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ New Folder</span>
                  </button>
                </div>
              </div>

              {/* Folder Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-[#E8E5E2]">
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                    selectedFolderId === null
                      ? 'bg-[#1F1F1F] text-white shadow'
                      : 'neu-button text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <span>All Photos</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
                    {photos.filter(p => !p.is_guest_uploaded).length}
                  </span>
                </button>

                {folders.map((f) => (
                  <div key={f.id} className="flex items-center group relative">
                    <button
                      onClick={() => setSelectedFolderId(f.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${
                        selectedFolderId === f.id
                          ? 'bg-[#E86A5B] text-white shadow'
                          : 'neu-button text-[#1F1F1F] hover:text-[#E86A5B]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color || '#E86A5B' }} />
                      <span>{f.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                        selectedFolderId === f.id ? 'bg-white/20 text-white' : 'bg-[#EBE8E1] text-[#6B6B6B]'
                      }`}>
                        {f.photo_count}
                      </span>
                    </button>

                    {!f.is_system && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(f.id, f.name);
                        }}
                        className="ml-1 p-1 rounded-lg text-[#6B6B6B] hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Uploader Box with Target Folder Dropdown */}
            <div className="neu-card p-6 sm:p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] text-[#E86A5B] flex items-center justify-center mx-auto">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Upload Event Photos</h3>
                <p className="text-xs text-[#6B6B6B] mt-1 max-w-md mx-auto">
                  Drag & drop high-resolution JPEG/PNG files. AI face vector indexing will process automatically.
                </p>
              </div>

              {/* Destination Folder Selector */}
              {folders.length > 0 && (
                <div className="max-w-xs mx-auto flex items-center justify-center gap-2 pt-2">
                  <span className="text-xs font-bold text-[#6B6B6B]">Destination:</span>
                  <select
                    value={uploadTargetFolderId}
                    onChange={(e) => setUploadTargetFolderId(e.target.value)}
                    className="gmm-input py-1.5 px-3 text-xs font-bold rounded-xl"
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.photo_count} photos)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
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
                  className="btn-primary inline-flex cursor-pointer py-2.5 px-6 text-xs font-bold shadow-md"
                >
                  {uploading ? 'Processing & Indexing AI Faces...' : 'Select Photos to Upload'}
                </label>
              </div>

              {uploadProgress && (
                <div className="p-3 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] text-xs font-bold text-[#E86A5B] max-w-md mx-auto">
                  {uploadProgress}
                </div>
              )}
            </div>

            {/* Gallery Control Bar & Bulk Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 neu-card p-5">
              <div className="flex items-center gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-[#1F1F1F] flex items-center gap-2">
                    <span>
                      {selectedFolderId 
                        ? `${folders.find(f => f.id === selectedFolderId)?.name || 'Folder'} Photos` 
                        : 'All Studio Photos'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#EBE8E1] text-[#E86A5B] text-xs font-bold shadow-[inset_1px_1px_3px_#D1CDC4,inset_-1px_-1px_3px_#FFFFFF]">
                      {displayedPhotos.length} Photos
                    </span>
                  </h4>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">High-resolution camera captures indexed with 128-d facial biometrics.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleSelectAllCurrentPhotos}
                  className="neu-button-sm py-2 px-3 text-xs text-[#1F1F1F] font-bold"
                >
                  Select All ({displayedPhotos.length})
                </button>

                <a
                  href={
                    selectedFolderId 
                      ? api.getFolderZipDownloadUrl(eventId, selectedFolderId)
                      : api.getDownloadAllZipUrl(eventId, 'studio')
                  }
                  download={`${event?.name || 'Event'}_Photos.zip`}
                  className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-2 w-full sm:w-auto shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Folder (.ZIP)</span>
                </a>
              </div>
            </div>

            {/* Photo Grid */}
            {displayedPhotos.length === 0 ? (
              <div className="p-12 text-center neu-card rounded-3xl">
                <Camera className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3 opacity-40" />
                <h4 className="text-sm font-bold text-[#1F1F1F]">No photos in this folder yet</h4>
                <p className="text-xs text-[#6B6B6B] mt-1">Upload camera shots or move existing photos into this ceremony folder.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {displayedPhotos.map((ph) => {
                  const isSelected = selectedPhotoIds.has(ph.id);
                  return (
                    <div 
                      key={ph.id} 
                      className={`aspect-square rounded-2xl overflow-hidden neu-card relative group border transition-all duration-150 ${
                        isSelected ? 'ring-4 ring-[#E86A5B] border-transparent scale-[0.98]' : 'border-white/60'
                      }`}
                    >
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

                      {/* Selection Checkbox */}
                      <button
                        onClick={() => handleTogglePhotoSelect(ph.id)}
                        className={`absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#E86A5B] text-white shadow-lg scale-110' 
                            : 'bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/60'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <CheckSquare className="w-3.5 h-3.5" />}
                      </button>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 z-10">
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

                      {ph.folder_name && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold group-hover:hidden">
                          {ph.folder_name}
                        </div>
                      )}

                      {ph.faces_detected_count > 0 && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-[#E86A5B]/90 text-white text-[10px] font-bold flex items-center gap-1 shadow group-hover:hidden">
                          <Sparkles className="w-3 h-3" />
                          <span>{ph.faces_detected_count}</span>
                        </div>
                      )}

                      {ph.uploaded_by_guest_name?.includes('[CAMERA') && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold flex items-center gap-1 shadow group-hover:hidden">
                          <Wifi className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Floating Bulk Photo Action Toolbar */}
            {selectedPhotoIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1F1F1F]/90 backdrop-blur-xl text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 animate-in slide-in-from-bottom-6">
                <span className="text-xs font-bold text-[#E86A5B]">
                  {selectedPhotoIds.size} photo(s) selected
                </span>

                <div className="h-4 w-px bg-white/20" />

                <button
                  onClick={() => setShowMoveModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E86A5B] hover:bg-[#D45849] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  <span>Move to Folder</span>
                </button>

                <button
                  onClick={handleClearSelection}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Operations & Timeline */}
        {activeTab === 'operations' && (
          <div className="space-y-8">
            {/* Ceremonies Timeline */}
            <div className="neu-card p-7">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Ceremony Timeline & Coverage</h3>
                  <p className="text-xs text-[#6B6B6B]">Wedding events, functions, and assigned photo counts.</p>
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
                      {c.assigned_crew && c.assigned_crew.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-[#D1CDC4] flex flex-wrap gap-1">
                          {c.assigned_crew.map((cr: any) => (
                            <span key={cr.id} className="px-2 py-0.5 rounded-md bg-[#FAF9F7] text-[10px] font-bold text-[#E86A5B] border border-[#E8E5E2]">
                              📷 {cr.name} ({cr.role})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Crew Members */}
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
                    <div key={cr.id} className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1F1F1F] block">{cr.name} ({cr.role})</span>
                          {cr.camera_tag && (
                            <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                              📷 {cr.camera_tag}
                            </span>
                          )}
                        </div>
                        {cr.phone && <span className="text-[11px] text-[#6B6B6B] block mt-0.5">{cr.phone}</span>}
                        {cr.assigned_ceremonies && cr.assigned_ceremonies.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-[#6B6B6B] font-semibold">Functions:</span>
                            {cr.assigned_ceremonies.map((cName: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                {cName}
                              </span>
                            ))}
                          </div>
                        )}
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

            {/* Deliverable Tasks */}
            <div className="neu-card p-7">
              <h3 className="text-lg font-display font-extrabold text-[#1F1F1F] mb-4">Post-Production Checklist</h3>
              <form onSubmit={handleAddTask} className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Color Grade Cinematic Teaser, Print Velvet Silk Album..."
                  className="gmm-input flex-1"
                />
                <button type="submit" className="btn-primary py-2.5 px-4 text-xs font-bold">
                  Add Task
                </button>
              </form>

              <div className="space-y-2.5">
                {operations?.tasks.map((task) => (
                  <div key={task.id} className="p-3.5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] flex items-center justify-between">
                    <span className={`text-xs font-bold ${task.is_completed ? 'line-through text-[#6B6B6B]' : 'text-[#1F1F1F]'}`}>
                      {task.title}
                    </span>
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      onChange={() => handleToggleTask(task.id, task.is_completed)}
                      className="w-4 h-4 text-[#E86A5B] rounded cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Finance */}
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

        {/* TAB: Guest Uploads */}
        {activeTab === 'guest-uploads' && (
          <div className="space-y-6">
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
                  Studio Rights: When enabled, guests scanning the QR code can upload candid photos from their phones.
                </p>
              </div>

              <button
                onClick={handleToggleGuestUploads}
                disabled={togglingGuestUploads}
                className={`py-2.5 px-5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  event?.allow_guest_uploads
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-[#3FA66B] border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {event?.allow_guest_uploads ? <ToggleRight className="w-5 h-5 text-rose-600" /> : <ToggleLeft className="w-5 h-5 text-[#3FA66B]" />}
                <span>{togglingGuestUploads ? 'Updating...' : event?.allow_guest_uploads ? 'Disable Guest Uploads' : 'Enable Guest Uploads'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: Album Proofing */}
        {activeTab === 'selection' && (
          <div className="neu-card p-8 text-center space-y-4">
            <Heart className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Client Album Proofing Portal</h3>
            <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
              Share this dedicated link with the bride & groom to curate and approve photos for their wedding album.
            </p>
            <button
              onClick={handleCopySelectionLink}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Client Proofing Link</span>
            </button>
          </div>
        )}

        {/* TAB: QR Flyer */}
        {activeTab === 'qr' && (
          <div className="neu-card p-8 text-center space-y-4">
            <QrCode className="w-16 h-16 text-[#E86A5B] mx-auto" />
            <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Guest Live QR Standee Flyer</h3>
            <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
              Guests scan this QR code at wedding tables to find all photos containing their face using AI.
            </p>
            <button
              onClick={handleCopyGuestLink}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Public Guest Link</span>
            </button>
          </div>
        )}

        {/* TAB: Leads */}
        {activeTab === 'leads' && (
          <div className="neu-card p-7 space-y-4">
            <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Wedding Guest Inquiries & CRM Leads</h3>
            {leads.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF9F7] rounded-2xl border border-dashed border-[#E8E5E2] text-xs text-[#6B6B6B]">
                No guest leads collected yet. Leads arrive automatically when guests request photo access.
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((l) => (
                  <div key={l.id} className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1F1F1F] block">{l.guest_name}</span>
                      <span className="text-[11px] text-[#6B6B6B]">{l.guest_phone}</span>
                    </div>
                    <span className="text-xs text-[#6B6B6B]">{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE FOLDER MODAL */}
      <Modal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        title="Create New Folder"
        subtitle="Organize photos by ceremony, portraits, drone, or custom categories."
        icon={<FolderPlus className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Folder Name *</label>
            <input
              type="text"
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. 01_Haldi, Ring Ceremony, Drone Candids"
              className="gmm-input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Folder Type</label>
            <NeomorphicSelect
              value={newFolderType}
              onChange={setNewFolderType}
              options={[
                { value: 'CEREMONY', label: 'Ceremony Function' },
                { value: 'PORTRAITS', label: 'Couple Portraits' },
                { value: 'CANDID', label: 'Candid Moments' },
                { value: 'DRONE', label: 'Drone & Aerial Shots' },
                { value: 'CUSTOM', label: 'Custom Folder' },
              ]}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5E2]">
            <button type="button" onClick={() => setShowFolderModal(false)} className="px-4 py-2.5 text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F]">Cancel</button>
            <button type="submit" className="btn-primary py-2.5 px-5 text-xs font-bold">Create Folder</button>
          </div>
        </form>
      </Modal>

      {/* BULK MOVE PHOTOS MODAL */}
      <Modal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        title="Move Photos to Folder"
        subtitle={`Select destination folder for ${selectedPhotoIds.size} photo(s).`}
        icon={<MoveRight className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Target Destination Folder</label>
            <select
              value={targetMoveFolderId}
              onChange={(e) => setTargetMoveFolderId(e.target.value)}
              className="gmm-input w-full py-2.5"
            >
              <option value="">-- Choose Target Folder --</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.photo_count} current photos)
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5E2]">
            <button type="button" onClick={() => setShowMoveModal(false)} className="px-4 py-2.5 text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F]">Cancel</button>
            <button 
              type="button" 
              onClick={handleMoveSelectedPhotos} 
              disabled={!targetMoveFolderId}
              className="btn-primary py-2.5 px-5 text-xs font-bold disabled:opacity-50"
            >
              Move Photos
            </button>
          </div>
        </div>
      </Modal>

      {/* CEREMONY MODAL */}
      <Modal
        isOpen={showCeremonyModal}
        onClose={() => setShowCeremonyModal(false)}
        title="Add Wedding Ceremony"
        subtitle="Define a wedding function (Haldi, Sangeet, Wedding, Reception)."
        icon={<Sparkles className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleAddCeremony} className="space-y-4">
          <div>
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
          <div>
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
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Mobile Phone (For Crew Login) *</label>
              <input
                type="tel"
                required
                value={crewPhone}
                onChange={(e) => setCrewPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="gmm-input w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Camera Device / Model Tag</label>
              <input
                type="text"
                value={crewCameraTag}
                onChange={(e) => setCrewCameraTag(e.target.value)}
                placeholder="e.g. Sony A7 IV (Cam 1)"
                className="gmm-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Agreed Payout (₹)</label>
              <input
                type="number"
                value={crewPayout}
                onChange={(e) => setCrewPayout(e.target.value)}
                className="gmm-input font-mono w-full"
              />
            </div>
          </div>

          {/* Assigned Ceremonies Multi-Select */}
          {operations?.ceremonies && operations.ceremonies.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
                Assign to Specific Ceremonies / Functions:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[#FAF9F7] rounded-xl border border-[#E8E5E2]">
                {operations.ceremonies.map((c) => {
                  const isSelected = crewAssignedCeremonies.includes(c.name);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setCrewAssignedCeremonies(crewAssignedCeremonies.filter((n) => n !== c.name));
                          } else {
                            setCrewAssignedCeremonies([...crewAssignedCeremonies, c.name]);
                          }
                        }}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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
          <div>
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
          <div>
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
          <div>
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
