"use client";

import React, { useState } from "react";
import { 
  Sparkles, Camera, CheckCircle2, User, Heart, Download, 
  Share2, MessageSquare, X, ArrowRight, ShieldCheck, RefreshCw, Zap
} from "lucide-react";
import Link from "next/link";

interface LiveDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_GUESTS = [
  { id: "1", name: "Ananya Sharma (Bride's Sister)", matchedCount: 18, avatar: "👩‍🦰", sampleUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" },
  { id: "2", name: "Rohan Verma (Groom's Friend)", matchedCount: 14, avatar: "👨", sampleUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" },
  { id: "3", name: "Priya & Siddharth (Family)", matchedCount: 22, avatar: "👩‍❤️‍👨", sampleUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80" },
];

const DEMO_MATCHED_PHOTOS = [
  { id: "p1", ceremony: "01_Mandap", url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&auto=format&fit=crop&q=80", matchScore: "98.4%" },
  { id: "p2", ceremony: "02_Haldi", url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80", matchScore: "97.1%" },
  { id: "p3", ceremony: "03_Sangeet", url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80", matchScore: "96.5%" },
  { id: "p4", ceremony: "01_Mandap", url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&auto=format&fit=crop&q=80", matchScore: "95.8%" },
  { id: "p5", ceremony: "04_Reception", url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600&auto=format&fit=crop&q=80", matchScore: "95.2%" },
  { id: "p6", ceremony: "02_Haldi", url: "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&auto=format&fit=crop&q=80", matchScore: "94.9%" },
];

export function LiveDemoModal({ isOpen, onClose }: LiveDemoModalProps) {
  const [selectedGuest, setSelectedGuest] = useState(SAMPLE_GUESTS[0]);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"AI_MATCH" | "COMMUNITY">("AI_MATCH");

  if (!isOpen) return null;

  const handleSimulateScan = (guest: typeof SAMPLE_GUESTS[0]) => {
    setSelectedGuest(guest);
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#F3F1EC] rounded-3xl border border-white/80 p-5 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),10px_10px_30px_#D0CCC3,-10px_-10px_30px_#FFFFFF] text-[#1F1F1F]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-2xl bg-[#F3F1EC] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF] hover:shadow-[inset_2px_2px_4px_#D4D0C7,inset_-2px_-2px_4px_#FFFFFF] text-[#6B6B6B] hover:text-[#1F1F1F] transition-all flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Demo Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2DDD5]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white shadow-md shadow-[#E86A5B]/25 shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
                  Interactive Live Demo
                </span>
                <span className="text-xs text-[#6B6B6B] font-bold">1,850 Photos in Event</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#1F1F1F] tracking-tight mt-0.5">
                Mehta &amp; Sharma Grand Wedding
              </h2>
            </div>
          </div>

          <Link
            href="/login?mode=signup"
            className="btn-primary py-2.5 px-5 text-xs font-bold shrink-0 flex items-center gap-1.5"
          >
            <span>Create Your Own Event</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Guest Selector Simulation Bar */}
        <div className="neu-card p-4 sm:p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E86A5B] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E86A5B]" />
              Select a Sample Wedding Guest to Test AI Face Match:
            </span>
            <span className="text-[11px] text-[#6B6B6B] font-semibold">Sub-50ms Vector Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_GUESTS.map((g) => {
              const isSelected = selectedGuest.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => handleSimulateScan(g)}
                  className={`p-3 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#E86A5B] text-white shadow-lg shadow-[#E86A5B]/25 scale-[1.02]"
                      : "bg-[#FAF9F7] border border-[#E8E5E2] hover:border-[#E86A5B]/50 text-[#1F1F1F]"
                  }`}
                >
                  <img
                    src={g.sampleUrl}
                    alt={g.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white shrink-0 shadow-sm"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{g.name}</span>
                    <span className={`text-[10px] block ${isSelected ? "text-white/80" : "text-[#6B6B6B]"}`}>
                      {g.matchedCount} Photos Matched
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Face Scanning Animation or Results Grid */}
        {scanning ? (
          <div className="py-16 text-center space-y-4 neu-card">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-[#E86A5B] border-t-transparent animate-spin" />
              <Sparkles className="w-6 h-6 text-[#E86A5B] absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F1F1F]">Scanning 1,850 Wedding Photos with AI...</h4>
              <p className="text-xs text-[#6B6B6B] mt-0.5">Matching 512-dimensional facial vector embeddings in 0.048s</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#1F1F1F]">
                  Found {selectedGuest.matchedCount} Photos for {selectedGuest.name}
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                100% Private to Guest
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {DEMO_MATCHED_PHOTOS.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/5] border border-[#E8E5E2] bg-[#FAF9F7] shadow-sm hover:shadow-md transition-all"
                >
                  <img
                    src={p.url}
                    alt="Matched Photo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white flex items-center justify-between">
                    <span className="font-mono">{p.ceremony}</span>
                    <span className="text-emerald-400 font-bold">{p.matchScore}</span>
                  </div>
                  <button
                    onClick={() => alert(`In live event, guest downloads HD photo with studio watermark!`)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-[#1F1F1F] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow"
                    title="Download HD Photo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Benefit Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <span className="text-xs text-emerald-950 font-medium leading-relaxed">
                  <strong>Zero Manual Sorting:</strong> Guests find their own portraits in 1.5 seconds. No Google Drive links, no post-wedding photo requests.
                </span>
              </div>

              <Link
                href="/login?mode=signup"
                className="btn-primary py-2 px-4 text-xs font-bold shrink-0 whitespace-nowrap"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
