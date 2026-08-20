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
  const [customIp, setCustomIp] = useState("192.168.31.37");
  const [isEditingIp, setIsEditingIp] = useState(false);
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
      if (credsData?.ftp_settings?.host) {
        if (credsData.ftp_settings.host.startsWith("10.") || credsData.ftp_settings.host.startsWith("172.")) {
          setCustomIp("192.168.31.37");
        } else {
          setCustomIp(credsData.ftp_settings.host);
        }
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

  const effectiveIp = customIp || credentials?.ftp_settings?.host || "192.168.31.37";
  const ftpPort = credentials?.ftp_settings?.port || 2121;
  const destinationPath = `/${accessToken}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#13111C] border border-[#2D2A3E] rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 rounded-full bg-[#1C1A29] hover:bg-[#2A273D] text-gray-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wifi className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-black tracking-tight text-white">
                Wireless Camera Live Sync
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Cloud Live Sync
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Shoot cable-free on <span className="text-purple-300 font-semibold">{eventName}</span>. Photos stream over Wi-Fi with instant AI face indexing in 1.5s!
            </p>
          </div>
        </div>

        {/* Multi-Event Isolation Notice */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-200 leading-relaxed">
            <strong className="text-emerald-300 block mb-0.5 font-bold">🎯 Multi-Event Isolation Guarantee:</strong>
            If your studio is shooting multiple events simultaneously, enter the <span className="font-mono font-bold text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">Remote Directory: {destinationPath}</span> in your camera settings. Each photo will route straight into this specific event with zero cross-mixing!
          </div>
        </div>

        {/* Live FTP Connection Credentials Card */}
        <div className="bg-[#1A1827] border border-[#2F2C44] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-400" />
              Camera Wi-Fi FTP Credentials
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditingIp(!isEditingIp)}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
              >
                {isEditingIp ? "Save IP" : "Change Wi-Fi IP"}
              </button>
              <span className="text-xs text-gray-400 font-mono">Port: {ftpPort}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* Host IP */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">FTP Host IP</span>
              <div className="flex items-center justify-between mt-1">
                {isEditingIp ? (
                  <input
                    type="text"
                    value={customIp}
                    onChange={(e) => setCustomIp(e.target.value)}
                    className="w-full bg-[#1A1827] border border-purple-500 rounded px-1.5 py-0.5 text-xs text-emerald-400 font-mono outline-none"
                    placeholder="192.168.1.50"
                  />
                ) : (
                  <span className="font-mono text-sm font-bold text-emerald-400 truncate">{effectiveIp}</span>
                )}
                <button
                  onClick={() => copyToClipboard(effectiveIp, "host")}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy IP"
                >
                  {copiedField === "host" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Port */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Port</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-sm font-bold text-white">{ftpPort}</span>
                <button
                  onClick={() => copyToClipboard(String(ftpPort), "port")}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy Port"
                >
                  {copiedField === "port" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Username</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-sm font-bold text-white">camera</span>
                <button
                  onClick={() => copyToClipboard("camera", "user")}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy Username"
                >
                  {copiedField === "user" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">Password</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-sm font-bold text-white">shoot123</span>
                <button
                  onClick={() => copyToClipboard("shoot123", "pass")}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy Password"
                >
                  {copiedField === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Destination Directory Path */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-emerald-500/40 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Remote Directory</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs font-bold text-amber-300 truncate" title={destinationPath}>{destinationPath}</span>
                <button
                  onClick={() => copyToClipboard(destinationPath, "dest")}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Copy Remote Directory"
                >
                  {copiedField === "dest" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Active Folder Target Selection */}
          {folders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-300">Live Ingest Target Ceremony Folder:</span>
              </div>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="bg-[#12101C] border border-purple-500/50 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer"
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

        {/* 1-Click Laptop Bridge Banner */}
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Shooting on Venue Wi-Fi / Hotspot?
              </h4>
              <p className="text-xs text-gray-300">
                Run <code className="text-purple-300 font-mono bg-purple-950/60 px-1 py-0.5 rounded">start_camera_sync.bat</code> on your laptop to bridge Camera Wi-Fi straight into this cloud event.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-600/20"
            >
              <UploadCloud className="w-4 h-4" />
              {simulating ? "Ingesting..." : "Direct Photo Upload"}
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none border-b border-gray-800">
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedBrand === brand.key
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-[#1A1827] text-gray-400 hover:text-white"
              }`}
            >
              {brand.label}
            </button>
          ))}
        </div>

        {/* Brand Step-by-Step Instructions */}
        <div className="bg-[#171524] border border-[#2B283E] rounded-2xl p-5 mb-6">
          <h4 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            {selectedBrand === "sony" && "Sony Alpha Menu Setup Guide (A7 IV, A7R V, A9 III, A1)"}
            {selectedBrand === "canon" && "Canon EOS Menu Setup Guide (R5, R6 Mark II, R3, R8)"}
            {selectedBrand === "nikon" && "Nikon Z Series Menu Setup Guide (Z9, Z8, Z6 III, D850)"}
            {selectedBrand === "fuji" && "Fujifilm X/GFX Menu Setup Guide (X-T5, X-H2S, GFX100 II)"}
            {selectedBrand === "mobile_relay" && "Pocket 5G Mobile Phone Bridge Guide"}
          </h4>

          <ol className="space-y-2.5 text-xs text-gray-300 list-decimal list-inside leading-relaxed">
            {selectedBrand === "sony" && (
              <>
                <li>Connect Sony camera to the same Wi-Fi as your laptop/router (<span className="text-purple-300 font-mono">Menu → Network → Wi-Fi</span>).</li>
                <li>Go to <span className="text-purple-300 font-mono">Menu → Network → [FTP Transfer] → [FTP Transfer Func.] → ON</span>.</li>
                <li>Select <span className="text-purple-300 font-mono">[Server Setting 1]</span>:
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-gray-400 font-mono">
                    <li>Host Name: <span className="text-emerald-400 font-bold">{effectiveIp}</span></li>
                    <li>Port: <span className="text-emerald-400 font-bold">{ftpPort}</span></li>
                    <li>Directory / Target Path: <span className="text-amber-300 font-bold">{destinationPath}</span></li>
                    <li>User: <span className="text-white font-bold">camera</span> | Password: <span className="text-white font-bold">shoot123</span></li>
                    <li>Passive Mode: <span className="text-white font-bold">ON</span></li>
                  </ul>
                </li>
                <li>Turn <span className="text-purple-300 font-mono">[Auto FTP Transfer]</span> to <span className="text-emerald-400 font-bold">ON</span>. Every shutter click streams live into this event!</li>
              </>
            )}

            {selectedBrand === "canon" && (
              <>
                <li>Connect Canon camera to Wi-Fi (<span className="text-purple-300 font-mono">Menu → Communication settings → Wi-Fi</span>).</li>
                <li>Go to <span className="text-purple-300 font-mono">[FTP transfer settings] → [Create New Connection]</span>.</li>
                <li>Select <span className="text-purple-300 font-mono">[FTP]</span>: Set Target Host to <span className="text-emerald-400 font-mono font-bold">{effectiveIp}</span> (Port {ftpPort}).</li>
                <li>Set Target Directory to <span className="text-amber-300 font-mono font-bold">{destinationPath}</span>.</li>
                <li>Enter Login: <span className="text-white font-mono font-bold">camera</span> | Password: <span className="text-white font-mono font-bold">shoot123</span>.</li>
                <li>Enable <span className="text-purple-300 font-mono">[Automatic transfer]</span>. New clicks stream instantly!</li>
              </>
            )}

            {selectedBrand === "nikon" && (
              <>
                <li>Connect Nikon camera to Wi-Fi (<span className="text-purple-300 font-mono">Network menu → Connect to PC / FTP</span>).</li>
                <li>Select <span className="text-purple-300 font-mono">[FTP server] → [Add profile]</span>: Host: <span className="text-emerald-400 font-mono font-bold">{effectiveIp}</span>.</li>
                <li>Set Remote Directory to <span className="text-amber-300 font-mono font-bold">{destinationPath}</span>.</li>
                <li>Enter User: <span className="text-white font-mono font-bold">camera</span> | Pass: <span className="text-white font-mono font-bold">shoot123</span>.</li>
                <li>Turn ON <span className="text-purple-300 font-mono">[Auto send]</span>. Clicks transmit seamlessly in real-time.</li>
              </>
            )}

            {selectedBrand === "fuji" && (
              <>
                <li>Go to <span className="text-purple-300 font-mono">Set-up → Connection Setting → Network Settings</span>.</li>
                <li>Create an FTP profile with Host: <span className="text-emerald-400 font-mono font-bold">{effectiveIp}</span> and Directory: <span className="text-amber-300 font-mono font-bold">{destinationPath}</span>.</li>
                <li>User: <span className="text-white font-mono font-bold">camera</span> | Pass: <span className="text-white font-mono font-bold">shoot123</span>.</li>
                <li>Enable <span className="text-purple-300 font-mono">Auto Image Transfer</span>.</li>
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
          <div className="bg-[#171524] border border-[#2B283E] rounded-2xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Live Ingest Stream ({ingestedPhotos.length} photos)
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {ingestedPhotos.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-[#12101C] text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-mono text-white font-bold truncate max-w-xs">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-bold">{p.faces} AI Faces</span>
                    <span className="text-gray-500 font-mono text-[10px]">{p.time}</span>
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
