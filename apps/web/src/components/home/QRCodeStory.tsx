'use client';

import React from 'react';
import { QrCode, Sparkles, Smartphone, Play, Image as ImageIcon } from 'lucide-react';

interface QRCodeStoryProps {
  onOpenDemo: () => void;
}

export function QRCodeStory({ onOpenDemo }: QRCodeStoryProps) {
  return (
    <section className="py-16 sm:py-24 lg:py-28 bg-white border-b border-[#E8E4DC] relative overflow-hidden">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Storytelling Copy */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
              <QrCode className="w-3.5 h-3.5" />
              <span>THE WEDDING GUEST EXPERIENCE</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl sm:text-5xl font-display font-black text-[#181818] tracking-tight leading-tight">
                One QR. <br />
                <span className="text-[#E86A5B]">Every Memory.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#605D58] leading-relaxed">
                Place one simple QR across the wedding experience and give every guest an effortless way to discover their photos.
              </p>
            </div>

            {/* 4 Step Visual Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-1">
                <div className="flex items-center justify-between">
                  <QrCode className="w-4 h-4 text-[#E86A5B]" />
                  <span className="text-[10px] font-mono text-[#605D58]">STEP 01</span>
                </div>
                <h4 className="text-xs font-bold text-[#181818]">Table QR Standee</h4>
                <p className="text-[11px] text-[#605D58]">Custom acrylic standees placed on guest dinner tables.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-1">
                <div className="flex items-center justify-between">
                  <Smartphone className="w-4 h-4 text-[#D9A441]" />
                  <span className="text-[10px] font-mono text-[#605D58]">STEP 02</span>
                </div>
                <h4 className="text-xs font-bold text-[#181818]">Guest Camera Scan</h4>
                <p className="text-[11px] text-[#605D58]">Opens in mobile browser without requiring any app install.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-1">
                <div className="flex items-center justify-between">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-[10px] font-mono text-[#605D58]">STEP 03</span>
                </div>
                <h4 className="text-xs font-bold text-[#181818]">Quick Selfie</h4>
                <p className="text-[11px] text-[#605D58]">1-second browser selfie initiates event gallery search.</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] space-y-1">
                <div className="flex items-center justify-between">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-mono text-[#605D58]">STEP 04</span>
                </div>
                <h4 className="text-xs font-bold text-[#181818]">Personal Gallery</h4>
                <p className="text-[11px] text-[#605D58]">Discovered photos ready for immediate viewing &amp; download.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Wedding Standee Showcase */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-[#FAF8F5] rounded-3xl sm:rounded-[36px] p-6 sm:p-8 border border-[#E8E4DC] shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="w-20 h-20 rounded-3xl bg-white border border-[#E8E4DC] flex items-center justify-center mx-auto shadow-sm">
                <QrCode className="w-12 h-12 text-[#181818]" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#605D58] uppercase font-bold tracking-widest block">
                  GET MY MOMENT • WEDDING QR
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-black text-[#181818]">
                  Ananya &amp; Kabir Wedding
                </h3>
                <p className="text-xs text-[#605D58]">
                  Scan with your phone camera to discover all your photos instantly.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-[#E8E4DC] text-xs font-bold text-[#181818] flex items-center justify-center gap-2 shadow-2xs">
                <Sparkles className="w-4 h-4 text-[#E86A5B]" />
                <span>AI Photo Discovery Ready • No App Download</span>
              </div>

              <button
                onClick={onOpenDemo}
                className="w-full btn-primary py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Live Guest Scan Experience</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default QRCodeStory;
