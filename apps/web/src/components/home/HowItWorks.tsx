'use client';

import React from 'react';
import { Camera, UploadCloud, QrCode, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    num: "01",
    title: "Shoot / Upload",
    subtitle: "Capture Event Photos",
    description: "Capture wedding ceremonies with your cameras and upload via Wi-Fi stream or web upload.",
    icon: Camera,
    color: "text-[#E86A5B] bg-[#E86A5B]/10 border-[#E86A5B]/20"
  },
  {
    num: "02",
    title: "Photos Sync",
    subtitle: "Organized by Ceremony",
    description: "New photographs sync into event albums and become available for guest matching.",
    icon: UploadCloud,
    color: "text-[#D9A441] bg-[#D9A441]/10 border-[#D9A441]/20"
  },
  {
    num: "03",
    title: "Share Event QR",
    subtitle: "On Tables & Screens",
    description: "Place custom QR standees on reception tables, welcome boards, or digital invitations.",
    icon: QrCode,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/20"
  },
  {
    num: "04",
    title: "Guest Selfie",
    subtitle: "Quick Browser Capture",
    description: "Guests scan the QR and take a quick selfie in their mobile browser without any app install.",
    icon: Smartphone,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20"
  },
  {
    num: "05",
    title: "AI Match",
    subtitle: "Searches Selected Event",
    description: "AI searches the wedding gallery to discover all photos matching each guest.",
    icon: Sparkles,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
  },
  {
    num: "06",
    title: "Personal Gallery",
    subtitle: "Delivered With Branding",
    description: "Guests view and download their personalized wedding gallery carrying your watermark.",
    icon: CheckCircle2,
    color: "text-rose-600 bg-rose-500/10 border-rose-500/20"
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 lg:py-28 bg-[#FAF8F5] border-b border-[#E8E4DC] relative">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <span>THE 6-STEP CONNECTED WORKFLOW</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            From Thousands of Photos to <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">Their Photos in Seconds</span>
          </h2>

          <p className="text-sm sm:text-base text-[#605D58] max-w-2xl mx-auto leading-relaxed">
            A continuous journey from camera click to personalized guest gallery with zero manual sorting.
          </p>
        </div>

        {/* Desktop 6-Step Connected Flow (Hidden on mobile < lg, shown on lg+) */}
        <div className="hidden lg:grid lg:grid-cols-6 gap-3.5 relative">
          {/* Horizontal Connecting Progress Line */}
          <div className="absolute top-1/4 left-8 right-8 h-0.5 bg-[#E8E4DC] -z-0" />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-3xl p-5 border border-[#E8E4DC] flex flex-col justify-between relative z-10 hover:border-[#E86A5B]/50 transition-all duration-200 shadow-2xs hover:shadow-sm"
              >
                <div>
                  {/* Step Icon & Number */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${step.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black tracking-wider text-[#605D58]/60 font-mono">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-[#181818] mb-0.5">
                    {step.title}
                  </h3>
                  <span className="text-[11px] font-bold text-[#E86A5B] block mb-2">
                    {step.subtitle}
                  </span>

                  <p className="text-xs text-[#605D58] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical Timeline Flow (Shown on mobile < lg) */}
        <div className="lg:hidden space-y-3.5 relative">
          <div className="absolute top-6 bottom-6 left-6 w-0.5 bg-[#E8E4DC]" />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative flex items-start gap-4 pl-2">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 relative z-10 bg-white shadow-xs ${step.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="bg-white rounded-2xl p-4.5 border border-[#E8E4DC] flex-1 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#181818]">
                      {step.title}
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-[#E86A5B] bg-[#E86A5B]/10 px-1.5 py-0.5 rounded">
                      {step.num}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#E86A5B] block">
                    {step.subtitle}
                  </span>
                  <p className="text-xs text-[#605D58] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
