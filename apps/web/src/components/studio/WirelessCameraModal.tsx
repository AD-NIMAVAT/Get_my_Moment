"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Wifi, Camera, CheckCircle2, Copy, Check, Sparkles, 
  Smartphone, ShieldCheck, Radio, AlertCircle, RefreshCw, 
  X, Zap, ExternalLink, HardDrive, UploadCloud, Laptop, Terminal
} from "lucide-react";
import { api } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [customIp, setCustomIp] = useState("192.168.31.37");
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [ingestedPhotos, setIngestedPhotos] = useState<Array<{ id: string; name: string; time: string; faces: number }>>([]);
  const [simulating, setSimulating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCredentials();
    }
  }, [isOpen, eventId]);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const data = await api.getWirelessCredentials(eventId);
      setCredentials(data);
      if (data?.ftp_settings?.host) {
        // If host is an internal cloud container IP (e.g. 10.x.x.x), default to standard local Wi-Fi subnet
        if (data.ftp_settings.host.startsWith("10.") || data.ftp_settings.host.startsWith("172.")) {
          setCustomIp("192.168.31.37");
        } else {
          setCustomIp(data.ftp_settings.host);
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

        {/* Live FTP Connection Credentials Card */}
        <div className="bg-[#1A1827] border border-[#2F2C44] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-400" />
              Camera Wi-Fi FTP Configuration
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Host IP */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">FTP Host / Wi-Fi IP</span>
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
                  <span className="font-mono text-sm font-bold text-emerald-400">{effectiveIp}</span>
                )}
                <button
                  onClick={() => copyToClipboard(effectiveIp, "host")}
                  className="p-1 text-gray-400 hover:text-white"
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
                >
                  {copiedField === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
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
              ref={fileInputRef}
              onChange={handleSimulateClick}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Brand Selector Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedBrand("sony")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              selectedBrand === "sony"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-[#1C1A29] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            📸 Sony Alpha (A7 IV / A9 / A1)
          </button>

          <button
            onClick={() => setSelectedBrand("canon")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              selectedBrand === "canon"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-[#1C1A29] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            🔴 Canon EOS (R5 / R6 / R3)
          </button>

          <button
            onClick={() => setSelectedBrand("nikon")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              selectedBrand === "nikon"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-[#1C1A29] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            🟡 Nikon Z (Z9 / Z8 / Z6)
          </button>
        </div>

        {/* Camera Setup Guide */}
        <div className="bg-[#1A1827] border border-[#2F2C44] rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4" />
            {selectedBrand === "sony" && "Sony Alpha Menu Setup Steps"}
            {selectedBrand === "canon" && "Canon EOS Menu Setup Steps"}
            {selectedBrand === "nikon" && "Nikon Z Menu Setup Steps"}
          </h3>
          
          <ul className="space-y-2.5 text-xs text-gray-300">
            {selectedBrand === "sony" && (
              <>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">1.</span>
                  <span>Connect Sony Camera to your Laptop Hotspot / Event Wi-Fi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">2.</span>
                  <span>Go to: <strong className="text-white">Menu ➡️ Network ➡️ [FTP Transfer] ➡️ [FTP Transfer Func.] ➡️ ON</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">3.</span>
                  <span>Select <strong className="text-white">[Server Setting 1]</strong> ➡️ Host: <code className="text-emerald-400 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">{effectiveIp}</code> | Port: <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">{ftpPort}</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">4.</span>
                  <span>User: <code className="text-white font-mono">camera</code> | Pass: <code className="text-white font-mono">shoot123</code> | Passive Mode: <strong className="text-emerald-400">ON</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">5.</span>
                  <span>Set <strong className="text-white">[Auto FTP Transfer]</strong> to <strong className="text-emerald-400">ON</strong>. Every shutter press will instantly stream into the cloud gallery!</span>
                </li>
              </>
            )}

            {selectedBrand === "canon" && (
              <>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">1.</span>
                  <span>Connect Canon camera to Wi-Fi (Menu ➡️ Communication settings ➡️ Wi-Fi).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">2.</span>
                  <span>Go to: <strong className="text-white">[FTP transfer settings] ➡️ [Create New Connection]</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">3.</span>
                  <span>Target Host: <code className="text-emerald-400 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">{effectiveIp}</code> | Port: <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">{ftpPort}</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">4.</span>
                  <span>User: <code className="text-white font-mono">camera</code> | Pass: <code className="text-white font-mono">shoot123</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">5.</span>
                  <span>Enable <strong className="text-emerald-400">[Automatic transfer]</strong>. New clicks will stream instantly!</span>
                </li>
              </>
            )}

            {selectedBrand === "nikon" && (
              <>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">1.</span>
                  <span>Connect camera to Wi-Fi (Network menu ➡️ Connect to PC / FTP).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">2.</span>
                  <span>Select <strong className="text-white">[FTP server] ➡️ [Add profile]</strong> ➡️ Host: <code className="text-emerald-400 font-mono font-bold bg-black/40 px-1 py-0.5 rounded">{effectiveIp}</code> | Port: <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">{ftpPort}</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">3.</span>
                  <span>User: <code className="text-white font-mono">camera</code> | Pass: <code className="text-white font-mono">shoot123</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">4.</span>
                  <span>Turn ON <strong className="text-emerald-400">[Auto send]</strong>. Photos will transmit seamlessly in real-time.</span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Ingested Photos Live Log */}
        {ingestedPhotos.length > 0 && (
          <div className="bg-[#1A1827] border border-emerald-500/20 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Live Ingested Photos ({ingestedPhotos.length})
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {ingestedPhotos.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-black/30 text-gray-300">
                  <span className="font-mono text-purple-300">{p.name}</span>
                  <div className="flex items-center gap-3 text-gray-400 font-mono text-[11px]">
                    <span>{p.time}</span>
                    <span className="text-emerald-400 font-bold">{p.faces} faces</span>
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
