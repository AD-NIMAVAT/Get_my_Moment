"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Camera, Wifi, CheckCircle2, Copy, Check, Sparkles, 
  Phone, Radio, UploadCloud, Folder as FolderIcon, Calendar, 
  MapPin, LogOut, ShieldCheck, ChevronRight, IndianRupee, Layers, Info, CheckCircle
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";

export default function CrewDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [activeCeremonyFolderId, setActiveCeremonyFolderId] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dash = await api.getCrewDashboard();
      setData(dash);
      if (dash.events && dash.events.length > 0) {
        setSelectedEventId(dash.events[0].event_id);
        if (dash.events[0].folders && dash.events[0].folders.length > 0) {
          setActiveCeremonyFolderId(dash.events[0].folders[0].id);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Session expired. Please log in.");
      router.push("/crew/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gmm_crew_token');
      localStorage.removeItem('gmm_crew_phone');
    }
    router.push("/crew/login");
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Copied ${fieldName}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSwitchCeremony = async (folderId: string, folderName: string) => {
    if (!selectedEventId) return;
    try {
      setActiveCeremonyFolderId(folderId);
      await api.setActiveCeremony(selectedEventId, folderId);
      toast.success(`🔴 Live Camera Target switched to: ${folderName}`);
    } catch (err: any) {
      toast.error("Failed to switch active ceremony");
    }
  };

  const handleDirectPhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedEventId) return;

    try {
      setUploading(true);
      setUploadProgress(`Uploading ${files.length} photos over 5G...`);
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      formData.append("crew_name", data?.crew_name || "Field Photographer");
      if (activeCeremonyFolderId) {
        formData.append("folder_id", activeCeremonyFolderId);
      }

      const res = await api.crewUploadPhotos(selectedEventId, formData);
      toast.success(`🎉 Ingested ${res.uploaded_count} photos into "${res.folder_name}"!`);
      setUploadProgress(null);
      loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
      setUploadProgress(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center p-4">
        <div className="neu-card p-8 rounded-3xl text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-[#E86A5B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#1F1F1F]">Loading Field Portal...</p>
        </div>
      </div>
    );
  }

  const currentEvent = data?.events?.find((e: any) => e.event_id === selectedEventId) || data?.events?.[0];
  const cameraSettings = currentEvent?.camera_settings;

  return (
    <div className="min-h-screen bg-[#F3F1EC] pb-16 selection:bg-[#E86A5B] selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#F3F1EC]/90 backdrop-blur-md border-b border-[#E8E5E2] px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white shadow-md shadow-[#E86A5B]/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-[#1F1F1F] tracking-tight flex items-center gap-1.5">
                {data?.crew_name}
                {data?.camera_tag && (
                  <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                    {data.camera_tag}
                  </span>
                )}
              </h1>
              <span className="text-[10px] text-[#6B6B6B] font-bold block">
                {data?.role} • {data?.phone}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-[#6B6B6B] hover:text-[#1F1F1F] hover:bg-[#EBE8E1] transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Event Selector Tabs (if multiple assigned events) */}
        {data?.events && data.events.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {data.events.map((ev: any) => (
              <button
                key={ev.event_id}
                onClick={() => {
                  setSelectedEventId(ev.event_id);
                  if (ev.folders && ev.folders.length > 0) {
                    setActiveCeremonyFolderId(ev.folders[0].id);
                  }
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedEventId === ev.event_id
                    ? "bg-[#E86A5B] text-white shadow-lg shadow-[#E86A5B]/30"
                    : "bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]"
                }`}
              >
                {ev.event_name}
              </button>
            ))}
          </div>
        )}

        {currentEvent ? (
          <>
            {/* Active Event Overview Banner */}
            <div className="neu-card p-6 sm:p-7 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E86A5B] block mb-1">
                    {currentEvent.studio_name} • Assigned Duty
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1F1F1F]">
                    {currentEvent.event_name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#6B6B6B] flex-wrap">
                    {currentEvent.event_date && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(currentEvent.event_date).toLocaleDateString()}
                      </span>
                    )}
                    {(currentEvent.venue || currentEvent.city) && (
                      <span className="flex items-center gap-1 font-semibold">
                        <MapPin className="w-3.5 h-3.5" />
                        {currentEvent.venue || currentEvent.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Agreed Payout Card */}
                <div className="bg-[#FAF9F7] p-3.5 rounded-2xl border border-[#E8E5E2] shrink-0 text-right min-w-[140px]">
                  <span className="text-[10px] text-[#6B6B6B] uppercase font-bold block">Agreed Payout</span>
                  <span className="text-lg font-extrabold text-[#1F1F1F] block mt-0.5">
                    ₹{currentEvent.payout_inr?.toLocaleString('en-IN')}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 ${
                    currentEvent.payout_status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentEvent.payout_status === 'PAID' ? '✓ Settled' : 'Payment Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Ceremony Switcher (1-Tap Fast Switch) */}
            <div className="neu-card p-6 sm:p-7">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-sm font-bold text-[#1F1F1F] uppercase tracking-wider">
                    Live Shooting Target Ceremony
                  </h3>
                </div>
                <span className="text-[11px] text-[#6B6B6B] font-bold">1-Tap Switch</span>
              </div>
              <p className="text-xs text-[#6B6B6B] mb-4">
                Tap the ceremony you are currently shooting. All incoming camera Wi-Fi clicks and 5G uploads will instantly route to this folder!
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentEvent.folders?.map((f: any) => {
                  const isActive = activeCeremonyFolderId === f.id;
                  const isAssigned = currentEvent.assigned_ceremonies?.some((cName: string) => f.name.toLowerCase().includes(cName.toLowerCase()));

                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSwitchCeremony(f.id, f.name)}
                      className={`p-3.5 rounded-2xl text-left transition-all relative ${
                        isActive
                          ? "bg-[#E86A5B] text-white shadow-lg shadow-[#E86A5B]/30 scale-[1.02]"
                          : "bg-[#FAF9F7] border border-[#E8E5E2] hover:border-[#E86A5B]/50 text-[#1F1F1F]"
                      }`}
                    >
                      {isAssigned && (
                        <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          isActive ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          Your Duty
                        </span>
                      )}
                      <FolderIcon className={`w-4 h-4 mb-2 ${isActive ? "text-white" : "text-[#E86A5B]"}`} />
                      <span className="text-xs font-bold block truncate">{f.name}</span>
                      <span className={`text-[10px] block mt-0.5 ${isActive ? "text-white/80" : "text-[#6B6B6B]"}`}>
                        {f.photo_count} photos synced
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera Wi-Fi FTP Credentials Card */}
            {cameraSettings && (
              <div className="neu-card p-6 sm:p-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-bold text-[#1F1F1F] uppercase tracking-wider">
                      Camera Wi-Fi FTP Pairing Details
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#6B6B6B]">Port: {cameraSettings.port}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {/* Host */}
                  <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">FTP Host / IP</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs font-bold text-[#1F1F1F] truncate">{cameraSettings.host}</span>
                      <button onClick={() => copyToClipboard(cameraSettings.host, "Host IP")} className="p-1 hover:text-[#E86A5B]">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Username</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs font-bold text-[#1F1F1F]">{cameraSettings.username}</span>
                      <button onClick={() => copyToClipboard(cameraSettings.username, "Username")} className="p-1 hover:text-[#E86A5B]">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                    <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Password</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs font-bold text-[#1F1F1F]">{cameraSettings.password}</span>
                      <button onClick={() => copyToClipboard(cameraSettings.password, "Password")} className="p-1 hover:text-[#E86A5B]">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Remote Directory */}
                  <div className="bg-[#FAF9F7] p-3 rounded-xl border border-emerald-300 bg-emerald-50/50">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold">Remote Path</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs font-bold text-emerald-900 truncate">{cameraSettings.destination_folder}</span>
                      <button onClick={() => copyToClipboard(cameraSettings.destination_folder, "Remote Directory")} className="p-1 text-emerald-700 hover:text-emerald-900">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Camera Setup Tip:</strong> Enter the <strong>Remote Path: {cameraSettings.destination_folder}</strong> in your Sony, Canon, or Nikon FTP profile. Photos will automatically flow to the currently active ceremony above!
                  </span>
                </div>
              </div>
            )}

            {/* Direct Mobile / 5G Burst Upload */}
            <div className="neu-card p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F] uppercase tracking-wider mb-1 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#E86A5B]" />
                  Direct 5G Mobile Gallery Upload
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Upload JPEG bursts directly from your phone or SD card reader to the active ceremony folder.
                </p>
                {uploadProgress && (
                  <span className="text-xs font-bold text-emerald-600 block mt-2 animate-pulse">
                    {uploadProgress}
                  </span>
                )}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary py-3 px-5 text-xs font-bold flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? "Ingesting Photos..." : "Upload Photos"}</span>
              </button>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                ref={fileInputRef}
                onChange={(e) => handleDirectPhotoUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <div className="neu-card p-12 text-center text-xs text-[#6B6B6B]">
            No shoot assignments active right now. Please contact your studio manager.
          </div>
        )}
      </main>
    </div>
  );
}
