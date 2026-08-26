'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, ArrowRight, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { HeroDemo } from './HeroDemo';

interface HeroSectionProps {
  onOpenDemo: () => void;
}

export function HeroSection({ onOpenDemo }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24">
      {/* Ambient Lighting Gradient */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[min(90vw,1100px)] h-[350px] bg-gradient-to-b from-[#E86A5B]/10 via-[#FAF8F5]/0 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14 space-y-4">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>THE WEDDING PHOTO DELIVERY &amp; STUDIO OS</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-display font-black tracking-tight text-[#181818] leading-[1.08]">
            Every Guest. <br />
            Every Photo. <br />
            <span className="text-[#E86A5B]">Instantly.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg lg:text-xl text-[#605D58] max-w-2xl sm:max-w-3xl mx-auto leading-relaxed font-normal">
            Turn every wedding into an instant, personalized photo experience. Guests scan a QR, take a selfie, and Get My Moment finds the photos they appear in — without manually searching through thousands of images.
          </p>

          <p className="text-xs sm:text-sm font-semibold text-[#181818] tracking-wide uppercase">
            Built specifically for professional wedding photographers and photography studios.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto btn-primary py-4 px-8 text-sm font-bold shadow-md flex items-center justify-center gap-2.5 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={onOpenDemo}
              className="w-full sm:w-auto py-4 px-7 rounded-2xl bg-white border border-[#E8E4DC] text-[#181818] hover:bg-[#FAF8F5] text-sm font-bold shadow-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95"
            >
              <Play className="w-4 h-4 text-[#E86A5B] fill-current" />
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Micro-Trust Badges */}
          <div className="pt-2 flex items-center justify-center gap-5 sm:gap-8 text-xs text-[#605D58] flex-wrap font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No App Required for Guests</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Free Starter Storage</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Built for Wedding Studios</span>
            </span>
          </div>
        </div>

        {/* Embedded 1200px Interactive Hero Phone Demo */}
        <HeroDemo onOpenLiveModal={onOpenDemo} />
      </div>
    </section>
  );
}

export default HeroSection;
