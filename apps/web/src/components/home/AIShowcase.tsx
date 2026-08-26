'use client';

import React from 'react';
import { Sparkles, Zap, Eye, Lock, Cpu, Check } from 'lucide-react';

const MATCHED_SAMPLES = [
  {
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&auto=format&fit=crop&q=80",
    event: "Mandap Pheras",
    badge: "Solo Portrait"
  },
  {
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80",
    event: "Sangeet Dance",
    badge: "Candid"
  },
  {
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80",
    event: "Haldi Rasam",
    badge: "Group Moment"
  }
];

export function AIShowcase() {
  return (
    <section id="ai-showcase" className="py-18 sm:py-24 lg:py-28 bg-[#141210] text-[#F8F5EF] relative overflow-hidden border-b border-[#2A2826]">
      {/* Background Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,1100px)] h-[400px] bg-gradient-to-tr from-[#E86A5B]/15 via-[#D9A441]/10 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E86A5B]/15 text-[#E86A5B] border border-[#E86A5B]/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI PHOTO DISCOVERY EXPERIENCE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white leading-tight">
            One Selfie. <br />
            Thousands of Photos. <br />
            <span className="text-[#E86A5B]">Their Moments Found.</span>
          </h2>

          <p className="text-sm sm:text-base text-[#F8F5EF]/75 max-w-2xl mx-auto leading-relaxed">
            Get My Moment searches the selected wedding gallery and turns thousands of event photographs into a personal photo-discovery experience for each guest.
          </p>
        </div>

        {/* Core Showcase Stage */}
        <div className="bg-[#1C1A17] rounded-3xl sm:rounded-[36px] border border-[#2E2B27] p-5 sm:p-10 shadow-2xl relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Input Selfie Card */}
            <div className="lg:col-span-4 bg-[#24211D] rounded-2xl sm:rounded-3xl p-5 border border-[#38342F] text-center space-y-4">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#38342F]">
                <span className="font-bold text-[#F8F5EF]/80">Input Reference</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  Quick Selfie
                </span>
              </div>

              <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border-2 border-[#E86A5B]/80 shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" 
                  alt="Guest Selfie" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-2">
                  <span className="text-[10px] font-bold text-white tracking-wider uppercase">
                    Priya Shah
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#F8F5EF]/60 leading-relaxed">
                Guest selfie is matched strictly within this selected wedding event.
              </p>
            </div>

            {/* Center: Search Status */}
            <div className="lg:col-span-4 text-center space-y-4 px-2">
              <div className="w-16 h-16 rounded-3xl bg-[#E86A5B]/20 border border-[#E86A5B]/40 text-[#E86A5B] flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-[#E86A5B] uppercase tracking-wider block">
                  AI EVENT SEARCH
                </span>
                <h3 className="text-xl font-display font-black text-white">
                  Searching Event Gallery
                </h3>
                <p className="text-xs text-[#F8F5EF]/70 max-w-xs mx-auto">
                  Locating matching guest portraits across high-resolution wedding ceremony albums.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#24211D] border border-[#38342F] inline-flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <Check className="w-4 h-4" />
                <span>Matches Found Across Ceremonies</span>
              </div>
            </div>

            {/* Right: Matched Gallery Output */}
            <div className="lg:col-span-4 bg-[#24211D] rounded-2xl sm:rounded-3xl p-5 border border-[#38342F] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#38342F]">
                <span className="font-bold text-[#F8F5EF]/80">Personal Gallery</span>
                <span className="text-[10px] font-mono text-[#E86A5B] bg-[#E86A5B]/15 px-2 py-0.5 rounded font-bold">
                  Matches Ready
                </span>
              </div>

              {/* Matched Photos Strip */}
              <div className="grid grid-cols-3 gap-2">
                {MATCHED_SAMPLES.map((sample, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden aspect-[4/5] border border-[#38342F] group">
                    <img src={sample.url} alt={sample.event} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <span className="text-[8px] font-bold text-white truncate">{sample.event}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-[#F8F5EF]/60 font-medium">
                  Delivered with custom studio logo watermark.
                </span>
              </div>
            </div>
          </div>

          {/* 4 Benefit Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t border-[#2E2B27]">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Fast Photo Discovery</span>
              </span>
              <p className="text-xs text-[#F8F5EF]/60">
                Surfaces matched portraits across wedding albums in seconds.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Built for Large Galleries</span>
              </span>
              <p className="text-xs text-[#F8F5EF]/60">
                Handles thousands of photos across multi-day wedding shoots.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Designed for Real Weddings</span>
              </span>
              <p className="text-xs text-[#F8F5EF]/60">
                Robust matching across varied indoor and outdoor ceremony lighting.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Event-Scoped Matching</span>
              </span>
              <p className="text-xs text-[#F8F5EF]/60">
                Searches operate strictly within the selected wedding event scope.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AIShowcase;
