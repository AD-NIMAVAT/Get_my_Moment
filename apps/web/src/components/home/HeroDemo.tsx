'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, UploadCloud, QrCode, Smartphone, Sparkles, 
  CheckCircle2, Download, ArrowRight, ShieldCheck, Check, Clock, Radio
} from 'lucide-react';

const WEDDING_MATCHES = [
  {
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&auto=format&fit=crop&q=80",
    tag: "Mandap Pheras",
    badge: "Solo Portrait"
  },
  {
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80",
    tag: "Reception Gala",
    badge: "Candid"
  },
  {
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80",
    tag: "Sangeet Night",
    badge: "Group Moment"
  },
  {
    url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&auto=format&fit=crop&q=80",
    tag: "Haldi Rasam",
    badge: "Family Portrait"
  }
];

export function HeroDemo({ onOpenLiveModal }: { onOpenLiveModal?: () => void }) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play steps (4.5s loop), pausing on hover, permanently stopping on manual click
  useEffect(() => {
    if (!isAutoPlaying || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev === 6 ? 1 : ((prev + 1) as 1 | 2 | 3 | 4 | 5 | 6)));
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPlaying, isHovered]);

  const handleManualStep = (step: 1 | 2 | 3 | 4 | 5 | 6) => {
    setIsAutoPlaying(false);
    setActiveStep(step);
  };

  // Status mapping for the Right Column Control Panel based on the active step
  const getStatusTelemetry = () => {
    switch (activeStep) {
      case 1:
        return {
          photos: { label: "Ready to Sync", state: "amber", pulse: true },
          guest: { label: "Ready", state: "neutral", pulse: false },
          matching: { label: "Standby", state: "neutral", pulse: false },
          galleries: { label: "Active", state: "neutral", pulse: false },
          activeWorkflow: "shoot"
        };
      case 2:
        return {
          photos: { label: "Syncing Photos", state: "emerald", pulse: true },
          guest: { label: "Ready", state: "neutral", pulse: false },
          matching: { label: "Standby", state: "neutral", pulse: false },
          galleries: { label: "Active", state: "neutral", pulse: false },
          activeWorkflow: "sync"
        };
      case 3:
        return {
          photos: { label: "Synced", state: "emerald", pulse: false },
          guest: { label: "QR Scanned", state: "coral", pulse: true },
          matching: { label: "Ready", state: "emerald", pulse: false },
          galleries: { label: "Active", state: "neutral", pulse: false },
          activeWorkflow: "match"
        };
      case 4:
        return {
          photos: { label: "Synced", state: "emerald", pulse: false },
          guest: { label: "Selfie Active", state: "coral", pulse: true },
          matching: { label: "Ready", state: "emerald", pulse: false },
          galleries: { label: "Active", state: "neutral", pulse: false },
          activeWorkflow: "match"
        };
      case 5:
        return {
          photos: { label: "Synced", state: "emerald", pulse: false },
          guest: { label: "Searching", state: "coral", pulse: true },
          matching: { label: "Matching Photos", state: "coral", pulse: true },
          galleries: { label: "Preparing", state: "amber", pulse: true },
          activeWorkflow: "match"
        };
      case 6:
      default:
        return {
          photos: { label: "Synced", state: "emerald", pulse: false },
          guest: { label: "Delivered", state: "emerald", pulse: false },
          matching: { label: "Matched", state: "emerald", pulse: false },
          galleries: { label: "Ready", state: "emerald", pulse: false },
          activeWorkflow: "deliver"
        };
    }
  };

  const status = getStatusTelemetry();

  return (
    <div 
      className="relative max-w-5xl 2xl:max-w-6xl mx-auto w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Segmented 6-Step Controls */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-none px-2">
        {[
          { num: 1, label: "01. Shoot", icon: Camera },
          { num: 2, label: "02. Sync", icon: UploadCloud },
          { num: 3, label: "03. Table QR", icon: QrCode },
          { num: 4, label: "04. Selfie", icon: Smartphone },
          { num: 5, label: "05. AI Search", icon: Sparkles },
          { num: 6, label: "06. Gallery", icon: CheckCircle2 },
        ].map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.num;
          return (
            <button
              key={step.num}
              onClick={() => handleManualStep(step.num as 1 | 2 | 3 | 4 | 5 | 6)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                isActive
                  ? "bg-[#181818] text-white shadow-sm scale-102"
                  : "bg-white text-[#605D58] border border-[#E8E4DC] hover:text-[#181818] hover:border-[#181818]/30"
              }`}
              aria-label={`Step ${step.label}`}
              aria-current={isActive ? "step" : undefined}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#E86A5B]" : "text-[#605D58]"}`} />
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 50/50 Showcase Container */}
      <div className="bg-white rounded-3xl sm:rounded-[36px] border border-[#E8E4DC] p-6 sm:p-9 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden">
        {/* Soft Ambient Radial Light */}
        <div className="absolute top-0 left-1/4 w-80 h-44 bg-[#E86A5B]/8 blur-3xl pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* ========================================================================= */}
          {/* LEFT 50% (Desktop): LIVE PRODUCT EXPERIENCE (What Is Happening)            */}
          {/* ========================================================================= */}
          <div className="flex justify-center relative">
            {/* Subtle contextual backdrop wash */}
            <div className="absolute inset-0 bg-[#FAF8F5]/80 rounded-[36px] -z-0 scale-95 opacity-60" />

            <div className="w-full max-w-[285px] sm:max-w-[310px] bg-[#181818] rounded-[38px] p-3 shadow-2xl border-4 border-[#2A2826] relative z-10">
              {/* Dynamic Island Notch */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#181818]" />
              </div>

              {/* Phone Inner Viewport */}
              <div className="bg-[#FAF8F5] rounded-[28px] overflow-hidden min-h-[460px] flex flex-col justify-between p-4 border border-[#E8E4DC] text-[#181818]">
                {/* Phone Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]/60">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-tight text-[#181818]">
                      Ananya &amp; Kabir Wedding
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-[#E86A5B] bg-[#E86A5B]/10 px-1.5 py-0.5 rounded">
                    LIVE
                  </span>
                </div>

                {/* Step 1: Shoot (Photographer Capture) */}
                {activeStep === 1 && (
                  <div className="space-y-3 py-2 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-[#E8E4DC] shadow-xs">
                      <img 
                        src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&auto=format&fit=crop&q=80" 
                        alt="Photographer Shoot" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1">
                        <Camera className="w-3 h-3 text-[#E86A5B]" />
                        <span>Capturing</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-display font-black text-[#181818]">
                        Photographer Shooting
                      </h4>
                      <p className="text-[11px] text-[#605D58] max-w-[200px] mx-auto leading-relaxed">
                        High-res portraits captured during Mandap and reception rituals.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Sync (Photos Entering Event) */}
                {activeStep === 2 && (
                  <div className="space-y-4 py-4 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center shadow-inner">
                      <UploadCloud className="w-10 h-10 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-display font-black text-[#181818]">
                        Photos Syncing to Event
                      </h4>
                      <p className="text-[11px] text-[#605D58] max-w-[200px] mx-auto leading-relaxed">
                        New captures entering ceremony folders for guest delivery.
                      </p>
                    </div>
                    <div className="w-full bg-[#E8E4DC] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#E86A5B] h-full rounded-full w-2/3 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Step 3: Table QR */}
                {activeStep === 3 && (
                  <div className="space-y-3 py-3 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-24 h-24 mx-auto bg-white rounded-2xl p-2 border-2 border-dashed border-[#E86A5B]/40 flex flex-col items-center justify-center shadow-xs">
                      <QrCode className="w-14 h-14 text-[#181818]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-display font-black text-[#181818]">
                        Scan Table QR Standee
                      </h4>
                      <p className="text-[11px] text-[#605D58] max-w-[200px] mx-auto leading-relaxed">
                        Guests point their camera at reception table standees.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Quick Selfie */}
                {activeStep === 4 && (
                  <div className="space-y-3 py-2 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-3 border-[#E86A5B] shadow-md">
                      <img 
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" 
                        alt="Guest Selfie" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-2 border-dashed border-white/80 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-display font-black text-[#181818]">
                        Take a Selfie
                      </h4>
                      <p className="text-[11px] text-[#605D58] max-w-[200px] mx-auto leading-relaxed">
                        In-browser selfie capture to find personal portraits.
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 5: AI Search */}
                {activeStep === 5 && (
                  <div className="space-y-4 py-6 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#181818] text-white flex flex-col items-center justify-center relative shadow-lg">
                      <Sparkles className="w-7 h-7 text-[#E86A5B] animate-bounce" />
                      <div className="absolute inset-0 rounded-full border-2 border-[#E86A5B] animate-ping opacity-30" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-display font-black text-[#181818]">
                        Searching Event Gallery
                      </h4>
                      <p className="text-[11px] text-[#605D58] max-w-[200px] mx-auto leading-relaxed">
                        Matching guest photos across all ceremony albums.
                      </p>
                    </div>
                    <div className="w-full bg-[#E8E4DC] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#E86A5B] h-full rounded-full w-3/4 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Step 6: Personal Gallery */}
                {activeStep === 6 && (
                  <div className="space-y-2.5 py-1 text-left animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#181818]">Personal Photos Ready</span>
                      <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        High Match
                      </span>
                    </div>

                    {/* 2x2 Photo Grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {WEDDING_MATCHES.map((photo, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/5] border border-[#E8E4DC] shadow-2xs group">
                          <img src={photo.url} alt={photo.tag} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[8px] font-bold truncate">
                            {photo.tag}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={onOpenLiveModal}
                      className="w-full btn-primary py-1.5 text-[10px] font-bold shadow-xs flex items-center justify-center gap-1.5 mt-0.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Personal Gallery</span>
                    </button>
                  </div>
                )}

                {/* Phone Bottom Guarantee */}
                <div className="pt-2 border-t border-[#E8E4DC]/60 flex items-center justify-between text-[9px] text-[#605D58]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Private to Event</span>
                  </span>
                  <span>Studio Watermarked</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT 50% (Desktop): PRODUCT STORY + LIVE DELIVERY STATUS                 */}
          {/* ========================================================================= */}
          <div className="space-y-6">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THE GUEST DELIVERY EXPERIENCE</span>
            </div>

            {/* Main Story Headline */}
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-black text-[#181818] tracking-tight leading-[1.12]">
                You keep shooting. <br />
                <span className="text-[#E86A5B]">We handle the delivery.</span>
              </h2>
              <p className="text-sm text-[#605D58] leading-relaxed max-w-[480px]">
                Guests discover their personal wedding photos while your team stays focused on capturing the event.
              </p>
            </div>

            {/* Live Delivery Status Panel (Synchronized SaaS Interface) */}
            <div className="bg-[#FAF8F5] rounded-2xl sm:rounded-3xl p-5 border border-[#E8E4DC] shadow-2xs space-y-3.5 max-w-[480px]">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E4DC]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#181818]">Ananya &amp; Kabir Wedding</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>LIVE DEMO</span>
                </div>
              </div>

              {/* Status Rows */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#605D58] flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-[#605D58]" />
                    <span>Photos</span>
                  </span>
                  <span className={`font-bold font-mono text-[11px] ${
                    status.photos.state === "emerald" ? "text-emerald-700" :
                    status.photos.state === "amber" ? "text-amber-700" : "text-[#181818]"
                  }`}>
                    {status.photos.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#605D58] flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#605D58]" />
                    <span>Guest Experience</span>
                  </span>
                  <span className={`font-bold font-mono text-[11px] ${
                    status.guest.state === "coral" ? "text-[#E86A5B]" :
                    status.guest.state === "emerald" ? "text-emerald-700" : "text-[#181818]"
                  }`}>
                    {status.guest.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#605D58] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#605D58]" />
                    <span>Photo Matching</span>
                  </span>
                  <span className={`font-bold font-mono text-[11px] ${
                    status.matching.state === "coral" ? "text-[#E86A5B]" :
                    status.matching.state === "emerald" ? "text-emerald-700" : "text-[#181818]"
                  }`}>
                    {status.matching.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#605D58] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#605D58]" />
                    <span>Personal Galleries</span>
                  </span>
                  <span className={`font-bold font-mono text-[11px] ${
                    status.galleries.state === "emerald" ? "text-emerald-700" :
                    status.galleries.state === "amber" ? "text-amber-700" : "text-[#181818]"
                  }`}>
                    {status.galleries.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Micro Workflow Progress Line */}
            <div className="space-y-2 max-w-[480px] pt-1">
              <span className="text-[10px] font-mono text-[#605D58] uppercase tracking-wider block">
                DELIVERY WORKFLOW STAGE
              </span>
              <div className="flex items-center justify-between text-xs font-bold text-[#605D58]">
                <span className={status.activeWorkflow === "shoot" ? "text-[#E86A5B]" : ""}>Shoot</span>
                <ArrowRight className="w-3 h-3 text-[#E8E4DC]" />
                <span className={status.activeWorkflow === "sync" ? "text-[#E86A5B]" : ""}>Sync</span>
                <ArrowRight className="w-3 h-3 text-[#E8E4DC]" />
                <span className={status.activeWorkflow === "match" ? "text-[#E86A5B]" : ""}>Match</span>
                <ArrowRight className="w-3 h-3 text-[#E8E4DC]" />
                <span className={status.activeWorkflow === "deliver" ? "text-[#E86A5B]" : ""}>Deliver</span>
              </div>
            </div>

            {/* Interactive Demo Modal Trigger */}
            <div className="pt-1">
              <button
                onClick={onOpenLiveModal}
                className="btn-primary py-3 px-6 text-xs font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Try Live Demo Wedding Experience</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default HeroDemo;
