'use client';

import React from 'react';
import { Camera, Smartphone, Sparkles, ShieldCheck, Tag } from 'lucide-react';

export function TrustStrip() {
  const TRUST_ITEMS = [
    {
      icon: Camera,
      title: "Built for Wedding Studios",
      desc: "Handles multi-camera teams and thousands of high-res event photos.",
    },
    {
      icon: Smartphone,
      title: "No App Required for Guests",
      desc: "100% browser-based. Guests scan QR and view moments in seconds.",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Photo Discovery",
      desc: "Locates every portrait matching the guest's quick browser selfie.",
    },
    {
      icon: ShieldCheck,
      title: "Mobile-First Guest Experience",
      desc: "Seamless viewing on Safari, Chrome, and direct WhatsApp links.",
    },
    {
      icon: Tag,
      title: "Studio-Branded Delivery",
      desc: "Every guest gallery view carries your studio watermark and logo.",
    },
  ];

  return (
    <section className="py-7 sm:py-9 bg-white border-y border-[#E8E4DC]">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6">
          {TRUST_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-[#E86A5B] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#181818]">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#605D58] mt-0.5 leading-relaxed">
                    {item.desc}
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

export default TrustStrip;
