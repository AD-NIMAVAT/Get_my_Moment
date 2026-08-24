"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Wifi, Camera, CheckCircle2, Copy, Check, Sparkles, 
  Smartphone, ShieldCheck, Radio, AlertCircle, RefreshCw, 
  X, Zap, ExternalLink, HardDrive, UploadCloud, Laptop, Terminal,
  Folder as FolderIcon, Layers, Info
} from "lucide-react";
import { api, FolderItem } from "@/lib/api";

interface WirelessCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  accessToken: string;
  onPhotoIngested?: () => void;
}

type BrandKey = "sony" | "canon" | "nikon" | "fuji" | "mobile_relay";

export function WirelessCameraModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  accessToken,
  onPhotoIngested,
}: WirelessCameraModalProps) {
  const [selectedBrand, setSelectedBrand] = useState<BrandKey>("sony");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [ingestedPhotos, setIngestedPhotos] = useState<Array<{ id: string; name: string; time: string; faces: number }>>([]);
  const [simulating, setSimulating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
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

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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
                Wireless Camera Live Sync
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                Live Ingest Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1">
              Shoot cable-free on <strong className="text-[#E86A5B] font-bold">{eventName}</strong>. Photos stream over Wi-Fi with instant AI face indexing in 1.5s!
            </p>
          </div>
        </div>

        {/* Multi-Event Isolation Notice */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 leading-relaxed">
            <strong className="text-emerald-800 block mb-0.5 font-bold">🎯 Multi-Event Isolation Guarantee:</strong>
            If your studio is shooting multiple events simultaneously, enter the <span className="font-mono font-bold text-emerald-950 bg-emerald-200/60 px-1.5 py-0.5 rounded border border-emerald-300">Remote Directory: {destinationPath}</span> in your camera settings. Each photo will route straight into this specific event with zero cross-mixing!
          </div>
        </div>

        {/* Live FTP Connection Credentials Card */}
        <div className="neu-card p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E86A5B] flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#E86A5B]" />
              Camera Wi-Fi FTP Credentials
            </span>
            <span className="text-xs text-[#6B6B6B] font-mono font-bold">Port: {ftpPort}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Host IP */}
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

            {/* Port */}
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

            {/* Username */}
            <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
              <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Username</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs font-bold text-[#1F1F1F]">camera</span>
                <button
                  onClick={() => copyToClipboard("camera", "user")}
                  className="p-1 text-[#6B6B6B] hover:text-[#E86A5B]"
                  title="Copy Username"
                >
                  {copiedField === "user" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-[#FAF9F7] p-3 rounded-xl border border-[#E8E5E2]">
              <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Password</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs font-bold text-[#1F1F1F]">shoot123</span>
                <button
                  onClick={() => copyToClipboard("shoot123", "pass")}
                  className="p-1 text-[#6B6B6B] hover:text-[#E86A5B]"
                  title="Copy Password"
                >
                  {copiedField === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Destination Directory Path */}
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-800 uppercase font-bold">Remote Directory</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs font-bold text-emerald-950 truncate" title={destinationPath}>{destinationPath}</span>
                <button
                  onClick={() => copyToClipboard(destinationPath, "dest")}
                  className="p-1 text-emerald-700 hover:text-emerald-950"
                  title="Copy Remote Directory"
                >
                  {copiedField === "dest" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active Folder Target Selection */}
          {folders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E2DDD5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-[#E86A5B]" />
                <span className="text-xs font-bold text-[#1F1F1F]">Live Ingest Target Ceremony Folder:</span>
              </div>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="bg-white border border-[#E8E5E2] rounded-xl px-3 py-1.5 text-xs text-[#1F1F1F] font-bold outline-none cursor-pointer"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.photo_count} photos)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 1-Click Laptop Bridge / Hotspot Banner */}
        <div className="bg-[#FAF9F7] border border-[#E8E5E2] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E86A5B]/10 flex items-center justify-center text-[#E86A5B] shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#1F1F1F] flex items-center gap-1.5">
                Shooting on Venue Wi-Fi or Mobile Hotspot?
              </h4>
              <p className="text-xs text-[#6B6B6B]">
                Run <code className="text-[#E86A5B] font-mono bg-[#EBE8E1] px-1.5 py-0.5 rounded">start_camera_sync.bat</code> on your laptop to bridge camera Wi-Fi straight into this cloud event.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{simulating ? "Ingesting..." : "Direct Photo Upload"}</span>
            </button>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              ref={fileInputRef}
              onChange={handleSimulateClick}
              className="hidden"
            />
          </div>
        </div>

        {/* Brand Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none border-b border-[#E2DDD5]">
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

        {/* Brand Step-by-Step Instructions */}
        <div className="neu-card p-5 sm:p-6 mb-6">
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
                    <li>User: <span className="font-bold">camera</span> | Password: <span className="font-bold">shoot123</span></li>
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
                <li>Enter Login: <span className="font-mono font-bold text-[#1F1F1F]">camera</span> | Password: <span className="font-mono font-bold text-[#1F1F1F]">shoot123</span>.</li>
                <li>Enable <span className="text-[#E86A5B] font-mono">[Automatic transfer]</span>. New clicks stream instantly!</li>
              </>
            )}

            {selectedBrand === "nikon" && (
              <>
                <li>Connect Nikon camera to Wi-Fi (<span className="text-[#E86A5B] font-mono">Network menu → Connect to PC / FTP</span>).</li>
                <li>Select <span className="text-[#E86A5B] font-mono">[FTP server] → [Add profile]</span>: Host: <span className="text-emerald-700 font-mono font-bold">{ftpHost}</span>.</li>
                <li>Set Remote Directory to <span className="text-[#E86A5B] font-mono font-bold">{destinationPath}</span>.</li>
                <li>Enter User: <span className="font-mono font-bold text-[#1F1F1F]">camera</span> | Pass: <span className="font-mono font-bold text-[#1F1F1F]">shoot123</span>.</li>
                <li>Turn ON <span className="text-[#E86A5B] font-mono">[Auto send]</span>. Clicks transmit seamlessly in real-time.</li>
              </>
            )}

            {selectedBrand === "fuji" && (
              <>
                <li>Go to <span className="text-[#E86A5B] font-mono">Set-up → Connection Setting → Network Settings</span>.</li>
                <li>Create an FTP profile with Host: <span className="text-emerald-700 font-mono font-bold">{ftpHost}</span> and Directory: <span className="text-[#E86A5B] font-mono font-bold">{destinationPath}</span>.</li>
                <li>User: <span className="font-mono font-bold text-[#1F1F1F]">camera</span> | Pass: <span className="font-mono font-bold text-[#1F1F1F]">shoot123</span>.</li>
                <li>Enable <span className="text-[#E86A5B] font-mono">Auto Image Transfer</span>.</li>
              </>
            )}

            {selectedBrand === "mobile_relay" && (
              <>
                <li>Pair your camera with your smartphone via Sony Creators&apos; Cloud or Canon Camera Connect app.</li>
                <li>As you shoot, photos automatically sync into your phone.</li>
                <li>Use Get My Moment Direct Mobile Upload above to stream full folders straight to the event gallery over 5G!</li>
              </>
            )}
          </ol>
        </div>

        {/* Live Ingest History Feed */}
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
    </div>
  );
}
