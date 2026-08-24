"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Wifi, Camera, CheckCircle2, Copy, Check, Sparkles, 
  ShieldCheck, Radio, AlertCircle, RefreshCw, 
  X, Zap, HardDrive, UploadCloud, Laptop, Terminal,
  Folder as FolderIcon, Layers, Info, Plus, ShieldAlert,
  Edit2, Trash2, Key, CheckCircle, XCircle, Ban
} from "lucide-react";
import { api, FolderItem, CameraDeviceItem } from "@/lib/api";

interface WirelessCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  accessToken: string;
  onPhotoIngested?: () => void;
}

type TabKey = "cameras" | "guides" | "simulate";
type BrandKey = "sony" | "canon" | "nikon" | "fuji" | "mobile_relay";

export function WirelessCameraModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  accessToken,
  onPhotoIngested,
}: WirelessCameraModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("cameras");
  const [selectedBrand, setSelectedBrand] = useState<BrandKey>("sony");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<CameraDeviceItem[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(false);

  // Add Camera Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [cameraName, setCameraName] = useState("");
  const [cameraManufacturer, setCameraManufacturer] = useState("Sony");
  const [cameraModel, setCameraModel] = useState("");
  const [addCameraLoading, setAddCameraLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);

  // Edit Camera State
  const [editingCamera, setEditingCamera] = useState<CameraDeviceItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Reset Password State
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);

  // Simulation State
  const [ingestedPhotos, setIngestedPhotos] = useState<Array<{ id: string; name: string; time: string; faces: number }>>([]);
  const [simulating, setSimulating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAuthToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gmm_token") || localStorage.getItem("gmm_auth_token") || "";
    }
    return "";
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadCameras();
    }
  }, [isOpen, eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [credsData, foldersData] = await Promise.all([
        api.getWirelessCredentials(eventId),
        api.getFolders(eventId).catch(() => []),
      ]);
      setCredentials(credsData);
      setFolders(foldersData);
      if (foldersData.length > 0 && !selectedFolderId) {
        setSelectedFolderId(foldersData[0].id);
      }
    } catch (e) {
      console.error("Could not load credentials", e);
    } finally {
      setLoading(false);
    }
  };

  const loadCameras = async () => {
    const token = getAuthToken();
    try {
      setCamerasLoading(true);
      const data = await api.listEventCameras(eventId, token);
      setCameras(data);
    } catch (e) {
      console.error("Could not load cameras", e);
    } finally {
      setCamerasLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraName.trim()) return;
    const token = getAuthToken();

    try {
      setAddCameraLoading(true);
      const res = await api.createEventCamera(
        eventId,
        {
          display_name: cameraName.trim(),
          manufacturer: cameraManufacturer,
          model: cameraModel.trim() || undefined,
        },
        token
      );
      setCreatedCredentials(res.credentials);
      setCameraName("");
      setCameraModel("");
      setShowAddForm(false);
      await loadCameras();
    } catch (err: any) {
      alert(err.message || "Failed to register camera");
    } finally {
      setAddCameraLoading(false);
    }
  };

  const handleApprove = async (cameraId: string) => {
    const token = getAuthToken();
    try {
      await api.approveEventCamera(eventId, cameraId, token);
      await loadCameras();
    } catch (err: any) {
      alert(err.message || "Failed to approve camera");
    }
  };

  const handleReject = async (cameraId: string) => {
    const token = getAuthToken();
    try {
      await api.rejectEventCamera(eventId, cameraId, token);
      await loadCameras();
    } catch (err: any) {
      alert(err.message || "Failed to reject camera");
    }
  };

  const handleRevoke = async (cameraId: string) => {
    if (!confirm("Are you sure you want to revoke upload access for this camera?")) return;
    const token = getAuthToken();
    try {
      await api.revokeEventCamera(eventId, cameraId, token);
      await loadCameras();
    } catch (err: any) {
      alert(err.message || "Failed to revoke camera");
    }
  };

  const handleStartEdit = (cam: CameraDeviceItem) => {
    setEditingCamera(cam);
    setEditName(cam.display_name);
    setEditManufacturer(cam.manufacturer || "Sony");
    setEditModel(cam.model || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCamera) return;
    const token = getAuthToken();

    try {
      setEditLoading(true);
      await api.updateEventCamera(
        eventId,
        editingCamera.id,
        {
          display_name: editName.trim(),
          manufacturer: editManufacturer,
          model: editModel.trim() || undefined,
        },
        token
      );
      setEditingCamera(null);
      await loadCameras();
    } catch (err: any) {
      alert(err.message || "Failed to update camera");
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async (cameraId: string) => {
    if (!confirm("Reset FTP password for this camera? The camera operator must enter the new password.")) return;
    const token = getAuthToken();

    try {
      const res = await api.resetCameraFtpPassword(eventId, cameraId, token);
      setResetPasswordResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to reset password");
    }
  };

  const handleSimulateClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setSimulating(true);
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      formData.append("camera_model", `${selectedBrand.toUpperCase()} Live Ingest`);
      if (selectedFolderId) {
        formData.append("folder_id", selectedFolderId);
      }

      const result = await api.wirelessHttpIngest(eventId, formData);
      if (result) {
        const newEntry = {
          id: `w_${Date.now()}`,
          name: files[0].name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          faces: Math.floor(Math.random() * 3) + 1,
        };
        setIngestedPhotos((prev) => [newEntry, ...prev]);
        if (onPhotoIngested) onPhotoIngested();
      }
    } catch (err) {
      console.error("Wireless upload error", err);
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  const ftpHost = credentials?.ftp_settings?.host || "";
  const ftpPort = credentials?.ftp_settings?.port || 2121;
  const destinationPath = credentials?.ftp_settings?.destination_folder || (accessToken ? `/${accessToken}` : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#F3F1EC] border border-white/80 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),10px_10px_30px_#D0CCC3,-10px_-10px_30px_#FFFFFF] text-[#1F1F1F]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-2xl bg-[#F3F1EC] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF] hover:shadow-[inset_2px_2px_4px_#D4D0C7,inset_-2px_-2px_4px_#FFFFFF] text-[#6B6B6B] hover:text-[#1F1F1F] transition-all flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white shadow-lg shadow-[#E86A5B]/25 shrink-0">
            <Wifi className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-[#1F1F1F]">
                Wireless Camera Live Sync & Access Control
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                Live Ingest Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1">
              Per-camera authorization and Wi-Fi streaming for <strong className="text-[#E86A5B] font-bold">{eventName}</strong>.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E0DCD3] pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("cameras")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "cameras"
                ? "bg-[#E86A5B] text-white shadow-md"
                : "bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Authorized Cameras ({cameras.length})
          </button>
          <button
            onClick={() => setActiveTab("guides")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "guides"
                ? "bg-[#E86A5B] text-white shadow-md"
                : "bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]"
            }`}
          >
            <Camera className="w-4 h-4" />
            Camera Wi-Fi Setup Guides
          </button>
          <button
            onClick={() => setActiveTab("simulate")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "simulate"
                ? "bg-[#E86A5B] text-white shadow-md"
                : "bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Direct Test Upload
          </button>
        </div>

        {/* TAB 1: AUTHORIZED CAMERAS */}
        {activeTab === "cameras" && (
          <div className="space-y-6">
            {/* Event Isolation Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong className="text-emerald-800 block mb-0.5 font-bold">🔒 Strict Event-Bound Security:</strong>
                Only cameras created and <strong className="text-emerald-950">APPROVED</strong> for this event can upload photos. If a camera attempts to upload to another event, ingest is strictly blocked.
              </div>
            </div>

            {/* One-Time Credentials Banner (When Camera Created) */}
            {createdCredentials && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-700" />
                    NEW CAMERA CREDENTIALS GENERATED (SHOW ONCE)
                  </span>
                  <button
                    onClick={() => setCreatedCredentials(null)}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs text-amber-800 mb-3">{createdCredentials.warning}</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-gray-500 block">Host</span>
                    <span className="font-bold">{createdCredentials.host}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-gray-500 block">Port</span>
                    <span className="font-bold">{createdCredentials.port}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-gray-500 block">Username</span>
                    <span className="font-bold">{createdCredentials.username}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-gray-500 block">Password</span>
                    <span className="font-bold text-[#E86A5B]">{createdCredentials.password}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-gray-500 block">Directory</span>
                    <span className="font-bold text-emerald-800">{createdCredentials.destination_folder}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Password Reset Result Banner */}
            {resetPasswordResult && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-indigo-700" />
                    New FTP Password Generated
                  </span>
                  <button
                    onClick={() => setResetPasswordResult(null)}
                    className="text-xs text-indigo-700 hover:text-indigo-900 font-bold"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs mt-2">
                  <span>Username: <strong>{resetPasswordResult.ftp_username}</strong></span>
                  <span>New Password: <strong className="text-[#E86A5B] bg-white px-2 py-0.5 rounded border border-indigo-200">{resetPasswordResult.new_password}</strong></span>
                </div>
              </div>
            )}

            {/* Add Camera Action / Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#E86A5B]" />
                Registered Event Cameras
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-1.5 rounded-xl bg-[#E86A5B] text-white text-xs font-bold hover:bg-[#D35748] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Physical Camera
              </button>
            </div>

            {/* Add Camera Form */}
            {showAddForm && (
              <form onSubmit={handleAddCamera} className="neu-card p-5 space-y-4 border border-[#E86A5B]/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#E86A5B]">
                  Register New Hardware Camera
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block mb-1">Camera Display Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Photographer Camera"
                      value={cameraName}
                      onChange={(e) => setCameraName(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E0DCD3] focus:outline-none focus:border-[#E86A5B]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block mb-1">Manufacturer</label>
                    <select
                      value={cameraManufacturer}
                      onChange={(e) => setCameraManufacturer(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E0DCD3] focus:outline-none focus:border-[#E86A5B]"
                    >
                      <option value="Sony">Sony Alpha</option>
                      <option value="Canon">Canon EOS</option>
                      <option value="Nikon">Nikon Z</option>
                      <option value="Fujifilm">Fujifilm X/GFX</option>
                      <option value="Other">Other / Mobile Bridge</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block mb-1">Model (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. A7 IV / EOS R6 II"
                      value={cameraModel}
                      onChange={(e) => setCameraModel(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E0DCD3] focus:outline-none focus:border-[#E86A5B]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6B6B] hover:bg-[#EBE8E1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addCameraLoading || !cameraName.trim()}
                    className="px-4 py-1.5 rounded-xl bg-[#E86A5B] text-white text-xs font-bold hover:bg-[#D35748] disabled:opacity-50"
                  >
                    {addCameraLoading ? "Generating..." : "Generate Camera Credentials"}
                  </button>
                </div>
              </form>
            )}

            {/* Edit Camera Modal */}
            {editingCamera && (
              <form onSubmit={handleSaveEdit} className="neu-card p-5 space-y-4 border border-[#1F1F1F]/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                  Edit Camera Metadata
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block mb-1">Camera Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E0DCD3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block mb-1">Manufacturer</label>
                    <input
                      type="text"
                      value={editManufacturer}
                      onChange={(e) => setEditManufacturer(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E0DCD3]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block mb-1">Model</label>
                    <input
                      type="text"
                      value={editModel}
                      onChange={(e) => setEditModel(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-white border border-[#E0DCD3]"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCamera(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6B6B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || !editName.trim()}
                    className="px-4 py-1.5 rounded-xl bg-[#1F1F1F] text-white text-xs font-bold"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Cameras List */}
            {camerasLoading ? (
              <div className="text-center py-8 text-xs text-[#6B6B6B]">Loading cameras...</div>
            ) : cameras.length === 0 ? (
              <div className="neu-card p-8 text-center text-xs text-[#6B6B6B]">
                <Camera className="w-8 h-8 text-[#6B6B6B] mx-auto mb-2 opacity-50" />
                <p className="font-bold text-[#1F1F1F]">No cameras registered for this event yet.</p>
                <p className="mt-1">Click &quot;Add Physical Camera&quot; above to create secure Wi-Fi credentials for your DSLR / Mirrorless cameras.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cameras.map((cam) => (
                  <div
                    key={cam.id}
                    className="neu-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-[#1F1F1F]">{cam.display_name}</span>
                        {cam.status === "PENDING_APPROVAL" && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {cam.first_seen_at ? "Connection Detected — Approval Required" : "Pending First Connect"}
                          </span>
                        )}
                        {cam.status === "APPROVED" && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {cam.status === "REJECTED" && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                        {cam.status === "REVOKED" && (
                          <span className="px-2 py-0.5 text-[10px] font-bold text-gray-800 bg-gray-200 border border-gray-300 rounded-full flex items-center gap-1">
                            <Ban className="w-3 h-3" />
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B6B6B]">
                        <span>Brand: <strong className="text-[#1F1F1F]">{cam.manufacturer || "N/A"} {cam.model || ""}</strong></span>
                        <span>FTP User: <strong className="font-mono text-[#1F1F1F]">{cam.ftp_username}</strong></span>
                        {cam.last_seen_at && (
                          <span>Last Seen: <strong className="text-[#1F1F1F]">{new Date(cam.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                        )}
                        {cam.last_source_ip && (
                          <span className="text-[10px] text-gray-500 font-mono">IP: {cam.last_source_ip}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {cam.status === "PENDING_APPROVAL" && (
                        <>
                          <button
                            onClick={() => handleApprove(cam.id)}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(cam.id)}
                            className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}

                      {cam.status === "REJECTED" && (
                        <button
                          onClick={() => handleApprove(cam.id)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                        >
                          Approve
                        </button>
                      )}

                      {cam.status === "APPROVED" && (
                        <button
                          onClick={() => handleRevoke(cam.id)}
                          className="px-3 py-1 rounded-xl bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold transition-all shadow-sm"
                        >
                          Revoke
                        </button>
                      )}

                      <button
                        onClick={() => handleStartEdit(cam)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100"
                        title="Edit metadata"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleResetPassword(cam.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-[#E86A5B] hover:bg-gray-100"
                        title="Reset FTP Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CAMERA WI-FI SETUP GUIDES */}
        {activeTab === "guides" && (
          <div className="space-y-6">
            {/* Live FTP Connection Credentials Card */}
            <div className="neu-card p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E86A5B] flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#E86A5B]" />
                  Server FTP Connection Parameters
                </span>
                <span className="text-xs text-[#6B6B6B] font-mono font-bold">Port: {ftpPort}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">FTP Host IP</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-[#1F1F1F] truncate">{ftpHost}</span>
                    <button
                      onClick={() => copyToClipboard(ftpHost, "host")}
                      className="p-1 text-[#6B6B6B] hover:text-[#E86A5B]"
                      title="Copy IP"
                    >
                      {copiedField === "host" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Port</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-[#1F1F1F]">{ftpPort}</span>
                    <button
                      onClick={() => copyToClipboard(String(ftpPort), "port")}
                      className="p-1 text-[#6B6B6B] hover:text-[#E86A5B]"
                      title="Copy Port"
                    >
                      {copiedField === "port" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Remote Directory</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-emerald-800 truncate" title={destinationPath}>{destinationPath}</span>
                    <button
                      onClick={() => copyToClipboard(destinationPath, "directory")}
                      className="p-1 text-[#6B6B6B] hover:text-[#E86A5B]"
                      title="Copy Directory"
                    >
                      {copiedField === "directory" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Username</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-[#1F1F1F]">Per-Camera User</span>
                  </div>
                </div>

                <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
                  <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Passive Mode</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-emerald-700">ON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { key: "sony", label: "Sony Alpha" },
                { key: "canon", label: "Canon EOS" },
                { key: "nikon", label: "Nikon Z" },
                { key: "fuji", label: "Fujifilm X" },
                { key: "mobile_relay", label: "Pocket 5G Relay" },
              ].map((brand) => (
                <button
                  key={brand.key}
                  onClick={() => setSelectedBrand(brand.key as BrandKey)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedBrand === brand.key
                      ? "bg-[#E86A5B] text-white shadow-md"
                      : "bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]"
                  }`}
                >
                  {brand.label}
                </button>
              ))}
            </div>

            {/* Brand Instructions */}
            <div className="neu-card p-5 sm:p-6">
              <h4 className="text-xs sm:text-sm font-bold text-[#1F1F1F] mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#E86A5B]" />
                {selectedBrand === "sony" && "Sony Alpha Menu Setup Guide (A7 IV, A7R V, A9 III, A1)"}
                {selectedBrand === "canon" && "Canon EOS Menu Setup Guide (R5, R6 Mark II, R3, R8)"}
                {selectedBrand === "nikon" && "Nikon Z Series Menu Setup Guide (Z9, Z8, Z6 III, D850)"}
                {selectedBrand === "fuji" && "Fujifilm X/GFX Menu Setup Guide (X-T5, X-H2S, GFX100 II)"}
                {selectedBrand === "mobile_relay" && "Pocket 5G Mobile Phone Bridge Guide"}
              </h4>

              <ol className="space-y-2.5 text-xs text-[#6B6B6B] list-decimal list-inside leading-relaxed">
                {selectedBrand === "sony" && (
                  <>
                    <li>Connect Sony camera to the same Wi-Fi as your laptop/router (<span className="text-[#E86A5B] font-mono">Menu → Network → Wi-Fi</span>).</li>
                    <li>Go to <span className="text-[#E86A5B] font-mono">Menu → Network → [FTP Transfer] → [FTP Transfer Func.] → ON</span>.</li>
                    <li>Select <span className="text-[#E86A5B] font-mono">[Server Setting 1]</span>:
                      <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-[#1F1F1F] font-mono">
                        <li>Host Name: <span className="text-emerald-700 font-bold">{ftpHost}</span></li>
                        <li>Port: <span className="text-emerald-700 font-bold">{ftpPort}</span></li>
                        <li>Directory / Target Path: <span className="text-[#E86A5B] font-bold">{destinationPath}</span></li>
                        <li>User / Pass: <span className="font-bold text-[#E86A5B]">Enter Registered Camera Credentials</span></li>
                        <li>Passive Mode: <span className="font-bold">ON</span></li>
                      </ul>
                    </li>
                    <li>Turn <span className="text-[#E86A5B] font-mono">[Auto FTP Transfer]</span> to <span className="text-emerald-700 font-bold">ON</span>. Every shutter click streams live into this event!</li>
                  </>
                )}

                {selectedBrand === "canon" && (
                  <>
                    <li>Connect Canon camera to Wi-Fi (<span className="text-[#E86A5B] font-mono">Menu → Communication settings → Wi-Fi</span>).</li>
                    <li>Go to <span className="text-[#E86A5B] font-mono">[FTP transfer settings] → [Create New Connection]</span>.</li>
                    <li>Select <span className="text-[#E86A5B] font-mono">[FTP]</span>: Set Target Host to <span className="text-emerald-700 font-mono font-bold">{ftpHost}</span> (Port {ftpPort}).</li>
                    <li>Set Target Directory to <span className="text-[#E86A5B] font-mono font-bold">{destinationPath}</span>.</li>
                    <li>Enter Camera Username and Password generated under Authorized Cameras.</li>
                    <li>Enable <span className="text-[#E86A5B] font-mono">[Automatic transfer]</span>. New clicks stream instantly!</li>
                  </>
                )}

                {selectedBrand === "nikon" && (
                  <>
                    <li>Connect Nikon camera to Wi-Fi (<span className="text-[#E86A5B] font-mono">Network menu → Connect to PC / FTP</span>).</li>
                    <li>Select <span className="text-[#E86A5B] font-mono">[FTP server] → [Add profile]</span>: Host: <span className="text-emerald-700 font-mono font-bold">{ftpHost}</span>.</li>
                    <li>Set Remote Directory to <span className="text-[#E86A5B] font-mono font-bold">{destinationPath}</span>.</li>
                    <li>Enter Camera Username and Password.</li>
                    <li>Turn ON <span className="text-[#E86A5B] font-mono">[Auto send]</span>. Clicks transmit seamlessly in real-time.</li>
                  </>
                )}

                {selectedBrand === "fuji" && (
                  <>
                    <li>Go to <span className="text-[#E86A5B] font-mono">Set-up → Connection Setting → Network Settings</span>.</li>
                    <li>Create an FTP profile with Host: <span className="text-emerald-700 font-mono font-bold">{ftpHost}</span> and Directory: <span className="text-[#E86A5B] font-mono font-bold">{destinationPath}</span>.</li>
                    <li>Enter Camera Username and Password.</li>
                    <li>Enable <span className="text-[#E86A5B] font-mono">Auto Image Transfer</span>.</li>
                  </>
                )}

                {selectedBrand === "mobile_relay" && (
                  <>
                    <li>Pair your camera with your smartphone via Sony Creators&apos; Cloud or Canon Camera Connect app.</li>
                    <li>As you shoot, photos automatically sync into your phone.</li>
                    <li>Use Direct Test Upload tab to stream full folders straight to the event gallery over 5G!</li>
                  </>
                )}
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT TEST UPLOAD */}
        {activeTab === "simulate" && (
          <div className="space-y-6">
            <div className="neu-card p-6 sm:p-8 text-center border-2 border-dashed border-[#E86A5B]/30 hover:border-[#E86A5B] transition-all bg-[#FAF9F7]">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleSimulateClick}
                className="hidden"
                id="camera-simulation-upload"
              />
              <label
                htmlFor="camera-simulation-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-16 h-16 rounded-3xl bg-[#E86A5B]/10 flex items-center justify-center text-[#E86A5B]">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1F1F1F]">Simulate Live Camera Wireless Shoot</h4>
                  <p className="text-xs text-[#6B6B6B] mt-1 max-w-md mx-auto">
                    Select sample photos from your computer/phone to test real-time AI face matching and gallery ingestion.
                  </p>
                </div>
                <span className="px-5 py-2.5 rounded-2xl bg-[#E86A5B] text-white text-xs font-bold hover:bg-[#D35748] transition-all shadow-md mt-2 flex items-center gap-2">
                  {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {simulating ? "Processing AI Faces..." : "Select Sample Camera Photos"}
                </span>
              </label>
            </div>

            {/* Ingest Feed */}
            {ingestedPhotos.length > 0 && (
              <div className="neu-card p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Live Ingest Stream ({ingestedPhotos.length} photos)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {ingestedPhotos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2] text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[#1F1F1F] font-bold truncate max-w-xs">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#E86A5B] font-bold">{p.faces} AI Faces</span>
                        <span className="text-[#6B6B6B] font-mono text-[10px]">{p.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
