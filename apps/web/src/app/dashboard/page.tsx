'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, EventItem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { 
  Plus, Camera, Users, Sparkles, Copy, Check, ExternalLink, 
  Calendar, ShieldCheck, ArrowUpRight, Trash2, Crown, Image as ImageIcon,
  Layers, HardDrive, CheckCircle2, QrCode, Download, Wifi, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [requireOtp, setRequireOtp] = useState(false);
  const [enableCamera, setEnableCamera] = useState(false);
  const [cameraBrand, setCameraBrand] = useState('Sony Alpha');
  const [cameraName, setCameraName] = useState('Main Camera 1');
  const [cameraModel, setCameraModel] = useState('');
  const [createdCameraCreds, setCreatedCameraCreds] = useState<any>(null);
  const [copiedCredField, setCopiedCredField] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Delete Confirm State
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [qrModalEvent, setQrModalEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadEvents();
    }
  }, [user, authLoading, router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents();
      setEvents(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    setCreating(true);
    try {
      const created = await api.createEvent({
        name: newEventName.trim(),
        allow_downloads: allowDownloads,
        require_otp: requireOtp,
      });

      let camCreds = null;
      if (enableCamera) {
        try {
          const camRes = await api.createEventCamera(
            created.id,
            {
              display_name: cameraName.trim() || 'Main Camera 1',
              manufacturer: cameraBrand,
              model: cameraModel.trim() || undefined,
              auto_approve: true,
            }
          );
          camCreds = {
            ...camRes.credentials,
            eventName: created.name,
            cameraName: cameraName.trim() || 'Main Camera 1',
            brand: cameraBrand,
          };
        } catch (camErr: any) {
          console.error('Camera creation warning:', camErr);
        }
      }

      setShowCreateModal(false);
      setNewEventName('');
      setEnableCamera(false);
      setCameraName('Main Camera 1');
      setCameraModel('');
      setEvents([created, ...events]);

      if (camCreds) {
        setCreatedCameraCreds(camCreds);
      }
      toast.success(`🎉 Event "${created.name}" created successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setDeleting(true);
    try {
      await api.deleteEvent(eventToDelete.id);
      setEvents(events.filter((ev) => ev.id !== eventToDelete.id));
      toast.success(`Event "${eventToDelete.name}" deleted`);
      setEventToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  const copyGuestLink = (accessToken: string, eventName: string) => {
    const url = `${window.location.origin}/e/${accessToken}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(accessToken);
    toast.success(`Copied live guest QR URL for "${eventName}"`);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const totalPhotos = events.reduce((acc, ev) => acc + (ev.photo_count || 0), 0);
  const totalGuests = events.reduce((acc, ev) => acc + (ev.guest_count || 0), 0);

  return (
    <div className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E2DDD5]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
              {user?.studio_name || 'Photography Studio OS'}
            </h1>
            {user?.is_verified ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#3FA66B] border border-emerald-200 flex items-center gap-1 neu-pill">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Pro Studio</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 neu-pill">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verification In-Review</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 font-normal">
            Manage your high-resolution event workspaces, AI vector matching, and client galleries.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary py-3 px-5 text-xs sm:text-sm flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Verification In-Review Alert */}
      {!user?.is_verified && (
        <div className="mt-6 p-4.5 rounded-3xl neu-card bg-[#FFFBF0] border border-amber-200/60 flex items-start gap-3.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="block font-bold mb-0.5 text-amber-950">Studio Verification Application Submitted</strong>
            <span>
              Your studio details ({user?.city || 'Location'}, Instagram / Portfolio) have been submitted to Get My Moment. 
              You have full active access to create events, test AI facial recognition, and deliver guest albums while verification is in progress.
            </span>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 my-8">
        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Events</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#E86A5B]">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] mt-2 sm:mt-3">{events.length}</div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">Active workspaces</div>
        </div>

        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Photos</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#E86A5B]">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#E86A5B] mt-2 sm:mt-3">{totalPhotos}</div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">128-d AI embeddings</div>
        </div>

        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Moments</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#3FA66B]">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#3FA66B] mt-2 sm:mt-3">{totalGuests}</div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">Selfie search matches</div>
        </div>

        <Link
          href="/dashboard/profile"
          className="neu-card p-4 sm:p-6 border-2 border-[#D9A441]/40 hover:border-[#D9A441] group cursor-pointer block relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#8F6420] uppercase tracking-wider">Active Plan</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#D9A441] group-hover:scale-110 transition-transform">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-sm sm:text-xl font-extrabold text-[#1F1F1F] mt-2 sm:mt-3 flex items-center gap-1">
            <span className="truncate">{user?.subscription_plan || 'SOLO_PRO'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D9A441] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </div>
          <div className="text-[10px] sm:text-xs text-[#D9A441] mt-0.5 sm:mt-1 font-bold truncate">
            Manage Plan & Quotas →
          </div>
        </Link>
      </div>

      {/* Floating Action Button (FAB) for Mobile Device Thumb Usability */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="md:hidden fixed right-5 bottom-20 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#E86A5B] to-[#C94F43] shadow-[6px_6px_16px_#C8C4BB,-6px_-6px_16px_#FFFFFF] text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        aria-label="Create New Event"
        title="Create New Event"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Events Catalogs */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-extrabold text-[#1F1F1F]">Your Event Catalogs</h2>
          <span className="text-xs text-[#6B6B6B] font-semibold neu-pill">{events.length} Total Events</span>
        </div>

        {loading && events.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-7 rounded-3xl neu-card space-y-4">
                <div className="w-20 h-5 rounded-full skeleton-shimmer" />
                <div className="w-3/4 h-7 rounded-xl skeleton-shimmer" />
                <div className="w-full h-16 rounded-2xl skeleton-shimmer" />
                <div className="w-full h-10 rounded-xl skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-16 text-center rounded-3xl neu-card">
            <div className="w-16 h-16 rounded-3xl bg-[#F3F1EC] shadow-[inset_3px_3px_6px_#D1CDC4,inset_-3px_-3px_6px_#FFFFFF] text-[#E86A5B] flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1F1F1F]">No events created yet</h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 max-w-sm mx-auto">Create your first event workspace to upload photos and generate private guest QR codes.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 btn-primary"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Your First Event</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="neu-card p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-[#3FA66B] border border-emerald-200 neu-pill">
                      {event.status}
                    </span>
                    <span className="text-xs text-[#6B6B6B] font-medium">
                      {new Date(event.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-display font-extrabold text-[#1F1F1F] group-hover:text-[#E86A5B] transition-colors line-clamp-1">
                    {event.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mt-5 p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] text-xs">
                    <div>
                      <span className="text-[#6B6B6B] font-bold block text-[11px] uppercase tracking-wider">PHOTOS</span>
                      <span className="text-[#1F1F1F] font-display font-extrabold text-lg mt-0.5 block">{event.photo_count}</span>
                    </div>
                    <div>
                      <span className="text-[#6B6B6B] font-bold block text-[11px] uppercase tracking-wider">GUESTS MATCHED</span>
                      <span className="text-[#3FA66B] font-display font-extrabold text-lg mt-0.5 block">{event.guest_count}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="btn-primary flex-1 py-2.5 px-4 text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Manage & Upload</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                  </Link>

                  <button
                    onClick={() => setQrModalEvent(event)}
                    className="neu-btn-secondary py-2.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                    title="View & Download Event QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#E86A5B]" />
                    <span>View QR</span>
                  </button>

                  <button
                    onClick={() => copyGuestLink(event.access_token, event.name)}
                    className="neu-btn-secondary py-2.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Copy guest QR link"
                  >
                    {copiedToken === event.access_token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#3FA66B]" />
                        <span className="text-[#3FA66B]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#6B6B6B]" />
                        <span>Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setEventToDelete(event)}
                    className="neu-icon-btn p-2.5 text-rose-600 cursor-pointer"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Event"
        subtitle="Create an event workspace with isolated facial vector search and printable QR code."
        icon={<Camera className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Event Name / Title *
            </label>
            <input
              type="text"
              required
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder="e.g. Liam & Sophia Luxury Wedding"
              className="gmm-input w-full"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] cursor-pointer hover:border-[#F3A08F] transition-colors">
              <input
                type="checkbox"
                checked={allowDownloads}
                onChange={(e) => setAllowDownloads(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-[#E86A5B] accent-[#E86A5B]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F1F1F] block">Allow Original Photo Downloads</span>
                <span className="text-[11px] text-[#6B6B6B] leading-tight block mt-0.5">Guests can download full-resolution camera originals</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] cursor-pointer hover:border-[#F3A08F] transition-colors">
              <input
                type="checkbox"
                checked={requireOtp}
                onChange={(e) => setRequireOtp(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-[#E86A5B] accent-[#E86A5B]"
              />
              <div>
                <span className="text-xs font-bold text-[#1F1F1F] block">Require Mobile OTP for Selfies</span>
                <span className="text-[11px] text-[#6B6B6B] leading-tight block mt-0.5">Verify guest phone numbers before AI face search</span>
              </div>
            </label>

            {/* Camera Setup Toggle */}
            <div className="p-3.5 rounded-2xl bg-[#F3EFEA] border border-[#E2DDD5] space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCamera}
                  onChange={(e) => setEnableCamera(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-[#E86A5B] accent-[#E86A5B]"
                />
                <div>
                  <span className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-[#E86A5B]" />
                    <span>Connect Photography Camera (Wi-Fi / FTP Ingest)</span>
                  </span>
                  <span className="text-[11px] text-[#6B6B6B] leading-tight block mt-0.5">
                    Auto-generate secure FTP credentials for your Sony, Canon, Nikon, or Fuji camera.
                  </span>
                </div>
              </label>

              {enableCamera && (
                <div className="pt-2.5 border-t border-[#E8E4DC] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                      Camera Brand
                    </label>
                    <select
                      value={cameraBrand}
                      onChange={(e) => setCameraBrand(e.target.value)}
                      className="gmm-input w-full text-xs"
                    >
                      <option value="Sony Alpha">Sony Alpha (Wi-Fi FTP)</option>
                      <option value="Canon EOS">Canon EOS (WFT / Wi-Fi)</option>
                      <option value="Nikon Z">Nikon Z / DSLR (WT / FTP)</option>
                      <option value="Fujifilm X">Fujifilm X Series</option>
                      <option value="Pocket Mobile Relay">Pocket Mobile Relay / App</option>
                      <option value="Custom Hardware">Other / Custom Ingest</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">
                      Camera Name / Tag
                    </label>
                    <input
                      type="text"
                      value={cameraName}
                      onChange={(e) => setCameraName(e.target.value)}
                      placeholder="e.g. Sony A7 IV - Stage"
                      className="gmm-input w-full text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#E2DDD5]">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary"
            >
              {creating ? 'Creating...' : 'Create Event Workspace'}
            </button>
          </div>
        </form>
      </Modal>

      {/* NEWLY PROVISIONED CAMERA CREDENTIALS MODAL */}
      <Modal
        isOpen={!!createdCameraCreds}
        onClose={() => setCreatedCameraCreds(null)}
        title="📷 Camera FTP Credentials Ready"
        subtitle={`Your camera "${createdCameraCreds?.cameraName}" is configured for ${createdCameraCreds?.eventName}.`}
        icon={<Wifi className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        {createdCameraCreds && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Camera auto-approved! Enter these settings into your camera's FTP / Wi-Fi menu:</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {[
                { label: 'FTP Server Host / IP', key: 'host', value: createdCameraCreds.host },
                { label: 'FTP Port', key: 'port', value: String(createdCameraCreds.port) },
                { label: 'FTP Username', key: 'username', value: createdCameraCreds.username },
                { label: 'FTP Password', key: 'password', value: createdCameraCreds.password },
                { label: 'Target Directory', key: 'destination_folder', value: createdCameraCreds.destination_folder },
              ].map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E2DDD5]"
                >
                  <div>
                    <span className="text-[10px] text-[#6B6B6B] uppercase font-bold block">{field.label}</span>
                    <span className="text-xs font-mono font-bold text-[#1F1F1F]">{field.value}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(field.value);
                      setCopiedCredField(field.key);
                      setTimeout(() => setCopiedCredField(null), 2000);
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-[#6B6B6B] hover:text-[#1F1F1F] transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedCredField === field.key ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              ⚠️ Save this password now. For security, it will not be shown again.
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCreatedCameraCreds(null)}
                className="btn-primary py-2.5 px-6 text-xs font-bold"
              >
                Done / I have configured my camera
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* QUICK EVENT QR MODAL */}
      <Modal
        isOpen={!!qrModalEvent}
        onClose={() => setQrModalEvent(null)}
        title={qrModalEvent ? `${qrModalEvent.name} — Guest QR` : 'Event QR Code'}
        subtitle="Guests scan this QR code on table standees to find their photos with AI."
        icon={<QrCode className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        {qrModalEvent && (
          <div className="space-y-5 text-center">
            {/* QR Card */}
            <div className="p-6 bg-gradient-to-b from-[#FFFDF9] to-[#FAF7F2] rounded-3xl border border-[#E8E5E2] shadow-inner inline-block mx-auto">
              <img
                src={`/api/v1/events/${qrModalEvent.id}/qr`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const guestUrl = `${window.location.origin}/e/${qrModalEvent.access_token}`;
                  target.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(guestUrl)}`;
                }}
                alt={`QR code for ${qrModalEvent.name}`}
                className="w-56 h-56 object-contain mx-auto rounded-2xl bg-white p-3 border border-[#EBE8E1] shadow-sm"
              />
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[#1F1F1F]">
                <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Scan to Find All Photos with AI</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => copyGuestLink(qrModalEvent.access_token, qrModalEvent.name)}
                className="neu-btn-secondary py-2.5 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>{copiedToken === qrModalEvent.access_token ? 'Copied Link!' : 'Copy Guest Link'}</span>
              </button>

              <a
                href={`/api/v1/events/${qrModalEvent.id}/qr`}
                download={`${qrModalEvent.slug || 'event'}-qr-code.png`}
                className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR PNG</span>
              </a>

              <Link
                href={`/dashboard/events/${qrModalEvent.id}?tab=qr`}
                className="neu-btn-secondary py-2.5 px-4 text-xs flex items-center gap-1.5 cursor-pointer text-[#1F1F1F]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>Full Standee Flyer</span>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM DELETE EVENT DIALOG */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Permanently Delete Event?"
        message={`Are you sure you want to delete "${eventToDelete?.name}"? All ${eventToDelete?.photo_count || 0} photos, face vector indexes, guest attendance, and financial records will be permanently removed.`}
        confirmText="Yes, Delete Event"
        isDanger={true}
        loading={deleting}
      />
    </div>
  );
}
