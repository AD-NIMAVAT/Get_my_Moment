'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, ArrowRight, Play, Sparkles } from 'lucide-react';

interface FinalCTAProps {
  onOpenDemo: () => void;
}

export function FinalCTA({ onOpenDemo }: FinalCTAProps) {
  return (
    <section className="py-18 sm:py-24 lg:py-28 bg-gradient-to-br from-[#E86A5B] via-[#DE5B4C] to-[#C94F43] text-white relative overflow-hidden">
      {/* Ambient Lighting Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-black/20 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>JOIN FORWARD-THINKING WEDDING STUDIOS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Your Next Wedding <br />
          Should Deliver Itself.
        </h2>

        <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
          Give every guest an effortless way to discover their photos while your studio stays focused on capturing the next moment — and manage the workflow behind it from one place.
        </p>

        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/login?mode=signup"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#181818] font-bold text-sm shadow-2xl hover:bg-[#FAF8F5] transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Camera className="w-4 h-4 text-[#E86A5B]" />
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4 text-[#E86A5B]" />
          </Link>

          <button
            onClick={onOpenDemo}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-black/20 hover:bg-black/30 border border-white/30 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Watch Demo</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default FinalCTA;
