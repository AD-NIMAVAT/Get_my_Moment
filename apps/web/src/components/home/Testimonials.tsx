'use client';

import React from 'react';
import { Star } from 'lucide-react';

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24 lg:py-28 bg-white border-b border-[#E8E4DC]">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>STUDIO EXPERIENCES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            Trusted by Wedding <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">Photography Studios</span>
          </h2>

          <p className="text-sm sm:text-base text-[#605D58] max-w-2xl mx-auto leading-relaxed">
            See how professional wedding photography studios are elevating guest delivery and studio workflow.
          </p>
        </div>

        {/* 60/40 Asymmetric Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto items-stretch">
          {/* Left Column: Featured Studio Story (58% width on lg) */}
          <div className="lg:col-span-7 bg-[#FAF8F5] rounded-3xl p-7 sm:p-9 border border-[#E8E4DC] flex flex-col justify-between space-y-6 shadow-2xs hover:border-[#E86A5B]/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-[#E86A5B] bg-[#E86A5B]/10 px-2.5 py-1 rounded-md">
                  FEATURED STUDIO
                </span>
              </div>

              <p className="text-sm sm:text-base text-[#181818] leading-relaxed italic font-normal">
                &ldquo;Get My Moment transformed our event delivery. Guests scan the table QR code during the reception and discover their personal moments without our team manually sorting folders.&rdquo;
              </p>
            </div>

            <div className="pt-4 border-t border-[#E8E4DC] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                K
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-[#181818] block truncate">
                  Kavya Patel
                </span>
                <span className="text-xs text-[#605D58] block truncate">
                  The Candid Story Studio • Ahmedabad
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 2 Supporting Stories (42% width on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#FAF8F5] rounded-3xl p-6 border border-[#E8E4DC] flex flex-col justify-between space-y-4 shadow-2xs hover:border-[#E86A5B]/40 transition-all flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-[#181818] leading-relaxed italic">
                  &ldquo;The Client Album Selection portal streamlined our proofing workflow. Couples select their album favorites with spread notes right from home.&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-[#E8E4DC] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E86A5B]/10 text-[#E86A5B] font-bold text-xs flex items-center justify-center shrink-0">
                  R
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#181818] block truncate">Rohan Mehta</span>
                  <span className="text-[11px] text-[#605D58] block truncate">Royal Shutter Cinema • Mumbai</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FAF8F5] rounded-3xl p-6 border border-[#E8E4DC] flex flex-col justify-between space-y-4 shadow-2xs hover:border-[#E86A5B]/40 transition-all flex-1">
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-[#181818] leading-relaxed italic">
                  &ldquo;Every guest download carries our watermark. We received direct inquiries for upcoming weddings through the table QR code experience.&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-[#E8E4DC] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E86A5B]/10 text-[#E86A5B] font-bold text-xs flex items-center justify-center shrink-0">
                  V
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#181818] block truncate">Vikram Rathore</span>
                  <span className="text-[11px] text-[#605D58] block truncate">Signature Clicks • Jaipur</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
