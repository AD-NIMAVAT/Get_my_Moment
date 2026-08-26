'use client';

import React from 'react';
import { ShieldCheck, Lock, HardDrive, CheckCircle2, ArrowRight } from 'lucide-react';

export function SecuritySection() {
  const PILLARS = [
    {
      icon: ShieldCheck,
      title: "Event-Scoped Matching",
      description: "Face searches operate strictly within the authenticated wedding event scope.",
      badge: "Event Isolation",
      badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200"
    },
    {
      icon: Lock,
      title: "Explicit Guest Consent",
      description: "Guests provide consent before taking a selfie for face matching.",
      badge: "Consent First",
      badgeColor: "text-[#E86A5B] bg-[#E86A5B]/10 border-[#E86A5B]/20"
    },
    {
      icon: HardDrive,
      title: "Controlled Event Access",
      description: "Access to private wedding galleries is managed via secure event tokens.",
      badge: "Secure Access",
      badgeColor: "text-purple-700 bg-purple-50 border-purple-200"
    },
    {
      icon: CheckCircle2,
      title: "Studio Data Controls",
      description: "Your studio maintains full control over uploaded photos and event data.",
      badge: "Studio Control",
      badgeColor: "text-blue-700 bg-blue-50 border-blue-200"
    }
  ];

  return (
    <section id="security" className="py-16 sm:py-24 lg:py-28 bg-white border-b border-[#E8E4DC]">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>TRUST &amp; DATA PRIVACY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            Your Clients&apos; Memories <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">Stay Safe &amp; Private</span>
          </h2>

          <p className="text-sm sm:text-base text-[#605D58] max-w-2xl mx-auto leading-relaxed">
            Engineered with strict event-scoped matching to protect guest privacy and safeguard studio assets.
          </p>
        </div>

        {/* Visual Lifecycle: What Happens to the Guest's Selfie? */}
        <div className="mb-12 max-w-4xl mx-auto bg-[#FAF8F5] rounded-3xl p-6 sm:p-8 border border-[#E8E4DC] shadow-2xs">
          <h3 className="text-xs font-mono font-bold text-[#E86A5B] uppercase tracking-wider mb-4 text-center">
            WHAT HAPPENS TO THE GUEST&apos;S SELFIE?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white border border-[#E8E4DC] space-y-1">
              <span className="text-[10px] font-mono text-[#605D58] block">01</span>
              <h4 className="text-xs font-bold text-[#181818]">Guest Selfie</h4>
              <p className="text-[11px] text-[#605D58]">Captured in browser with guest consent.</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E8E4DC] space-y-1">
              <span className="text-[10px] font-mono text-[#605D58] block">02</span>
              <h4 className="text-xs font-bold text-[#181818]">Event Matching</h4>
              <p className="text-[11px] text-[#605D58]">Searches strictly within the selected event.</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E8E4DC] space-y-1">
              <span className="text-[10px] font-mono text-[#605D58] block">03</span>
              <h4 className="text-xs font-bold text-[#181818]">Personal Results</h4>
              <p className="text-[11px] text-[#605D58]">Matched photos delivered to guest device.</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-[#E8E4DC] space-y-1">
              <span className="text-[10px] font-mono text-[#605D58] block">04</span>
              <h4 className="text-xs font-bold text-[#181818]">Data Handling</h4>
              <p className="text-[11px] text-[#605D58]">Managed according to studio data controls.</p>
            </div>
          </div>
        </div>

        {/* 4 Security Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx} 
                className="bg-[#FAF8F5] rounded-3xl p-6 border border-[#E8E4DC] flex flex-col justify-between space-y-3.5 shadow-2xs hover:border-[#E86A5B]/40 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#E8E4DC] text-[#E86A5B] flex items-center justify-center shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pillar.badgeColor}`}>
                      {pillar.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#181818]">
                    {pillar.title}
                  </h3>

                  <p className="text-xs text-[#605D58] leading-relaxed">
                    {pillar.description}
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

export default SecuritySection;
