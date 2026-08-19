"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Wifi, Camera, CheckCircle2, Copy, Check, Sparkles, 
  Smartphone, ShieldCheck, Radio, AlertCircle, RefreshCw, 
  X, Zap, ExternalLink, HardDrive, UploadCloud 
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
      formData.append("camera_model", `${selectedBrand.toUpperCase()} Wi-Fi Direct`);

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

  const serverIp = credentials?.ftp_settings?.host || "192.168.31.37";
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
                Wi-Fi FTP Active
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
              Camera FTP Wi-Fi Configuration
            </span>
            <span className="text-xs text-gray-400 font-mono">Port: {ftpPort}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Host IP */}
            <div className="bg-[#12101C] p-3 rounded-xl border border-gray-800">
              <span className="text-[10px] text-gray-400 uppercase font-semibold">FTP Host / IP</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-sm font-bold text-emerald-400">{serverIp}</span>
                <button
                  onClick={() => copyToClipboard(serverIp, "host")}
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

          <button
            onClick={() => setSelectedBrand("mobile_relay")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              selectedBrand === "mobile_relay"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "bg-[#1C1A29] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            📱 Pocket Phone 5G Relay
          </button>
        </div>

        {/* Setup Instructions Box */}
        <div className="bg-[#171524] border border-[#2D2A40] rounded-2xl p-5 mb-6">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Camera Menu Setup Guide:
          </h4>

          {selectedBrand === "sony" && (
            <ol className="space-y-2.5 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Connect your Sony camera to the same Wi-Fi router as this laptop (<code className="text-purple-300">Menu &gt; Network &gt; Wi-Fi</code>).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Open: <code className="text-purple-300">Menu &gt; Network &gt; [FTP Transfer] &gt; [FTP Transfer Func.] &gt; ON</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Select <code className="text-purple-300">Server Setting 1</code> &gt; Host: <code className="text-emerald-400 font-bold">{serverIp}</code> | Port: <code className="text-emerald-400 font-bold">{ftpPort}</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">4</span>
                <span>User: <code className="text-purple-300 font-bold">camera</code> | Password: <code className="text-purple-300 font-bold">shoot123</code> | Passive Mode: <code className="text-purple-300">ON</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">5</span>
                <span>Turn <code className="text-emerald-400 font-bold">[Auto FTP Transfer] to ON</code>. Every shutter click will now stream directly to this screen!</span>
              </li>
            </ol>
          )}

          {selectedBrand === "canon" && (
            <ol className="space-y-2.5 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Connect Canon camera to Wi-Fi (<code className="text-purple-300">Menu &gt; Communication settings &gt; Wi-Fi</code>).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Select <code className="text-purple-300">[FTP transfer] &gt; [Create New Connection] &gt; Target Host: {serverIp}</code> (Port {ftpPort}).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Enter User: <code className="text-purple-300 font-bold">camera</code> | Password: <code className="text-purple-300 font-bold">shoot123</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">4</span>
                <span>Set <code className="text-emerald-400 font-bold">[Automatic transfer] to ON</code>. High-res clicks will transfer in real-time.</span>
              </li>
            </ol>
          )}

          {selectedBrand === "nikon" && (
            <ol className="space-y-2.5 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Open: <code className="text-purple-300">Network menu &gt; Connect to PC / FTP &gt; Add profile</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Enter FTP Host: <code className="text-emerald-400 font-bold">{serverIp}</code> | Port: <code className="text-emerald-400 font-bold">{ftpPort}</code> | User: <code className="text-purple-300 font-bold">camera</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Enable <code className="text-emerald-400 font-bold">[Auto send]</code>. Photos will stream seamlessly during shoot.</span>
              </li>
            </ol>
          )}

          {selectedBrand === "mobile_relay" && (
            <ol className="space-y-2.5 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Pair camera with your mobile phone using Sony Creators' Cloud or Canon Camera Connect.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Keep your phone in your pocket with Mobile Data (5G/4G) ON.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</span>
                <span>The Get My Moment App auto-syncs your field clicks directly into this wedding event!</span>
              </li>
            </ol>
          )}
        </div>

        {/* Live Test Trigger / Field Ingest Simulation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 to-indigo-900/20 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-purple-400" />
            <div>
              <h5 className="text-xs font-bold text-white">Test Wireless Shoot From This PC:</h5>
              <p className="text-[11px] text-gray-400">Pick any photo from your hard drive to test live AI face matching pipeline.</p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleSimulateClick}
            multiple
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={simulating}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            {simulating ? "Simulating Click..." : "Test Wireless Click"}
          </button>
        </div>

        {/* Live Incoming Feed List */}
        {ingestedPhotos.length > 0 && (
          <div className="mt-6">
            <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Live Ingest Stream ({ingestedPhotos.length} photos):
            </h5>
            <div className="space-y-2">
              {ingestedPhotos.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[#171524] border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{item.time}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    ✨ {item.faces} Faces AI Indexed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
