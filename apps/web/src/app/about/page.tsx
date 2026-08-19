'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { 
  Camera, Sparkles, ShieldCheck, Zap, QrCode, Cpu, ArrowRight, 
  CheckCircle2, Lock, Heart, Users, Award, Crown, Check, Building2, 
  MapPin, Phone, Mail, Globe, Layers, TrendingUp
} from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#F3F1EC] text-[#1F1F1F]">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-[#E2DDD5]">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#E86A5B]/15 via-[#D9A441]/10 to-transparent blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20 mb-6 shadow-sm neu-pill">
            <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>OUR MISSION & TECHNOLOGY STORY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-[#1F1F1F] max-w-4xl mx-auto leading-tight">
            Built for Wedding Photographers. <br />
            <span className="text-[#E86A5B]">Powered by Real-Time AI.</span>
          </h1>

          <p className="mt-6 text-sm sm:text-base text-[#6B6B6B] max-w-2xl mx-auto leading-relaxed font-medium">
            Get My Moment is a next-generation Studio Business OS and AI photo delivery platform engineered specifically for Indian wedding and event photography studios.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="btn-primary py-3.5 px-8 text-xs sm:text-sm font-bold shadow-lg shadow-[#E86A5B]/25 flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Start Free Studio Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="neu-btn-secondary py-3.5 px-7 text-xs sm:text-sm font-bold"
            >
              <span>Get in Touch with Us</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE STORY BEHIND GET MY MOMENT */}
      <section className="py-16 sm:py-20 bg-[#FAF9F7] border-b border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">WHY WE BUILT THIS</span>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] mt-2 leading-tight">
                No More Hard Drives, USB Sticks, or 6-Month Delivery Delays.
              </h2>
              <p className="mt-4 text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                Indian weddings are grand celebrations with thousands of candid moments, ceremonies, and cherished memories. Yet, for years, the photography industry struggled with traditional delivery pipelines:
              </p>

              <div className="mt-6 space-y-3.5">
                {[
                  { title: 'Chaotic Client Photo Selection', desc: 'Couples taking months to shortlist 300 album photos from 5,000 RAW images.' },
                  { title: 'Scattered Guest Sharing', desc: 'Guests constantly asking "Where are my photos?" without an easy way to find themselves.' },
                  { title: 'Disorganized Back-Office', desc: 'Tracking leads on WhatsApp chats, paper quotes, and manual GST invoices.' },
                ].map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#EBE8E1] border border-white/60">
                    <div className="w-5 h-5 rounded-full bg-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1F1F1F]">{point.title}</h4>
                      <p className="text-[11px] text-[#6B6B6B] mt-0.5">{point.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-[#6B6B6B] font-semibold">
                <strong>Get My Moment</strong> solves all three: guests find their photos via 1 selfie scan, couples pick album favorites online, and studios run leads, milestones, and GST billing in one place.
              </p>
            </div>

            {/* Visual Card */}
            <div className="neu-card p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EE7E6F] to-[#E86A5B] flex items-center justify-center text-white font-bold shadow-md">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1F1F1F]">Studio OS Architecture</h3>
                    <p className="text-[11px] text-[#6B6B6B]">Engineered in Gujarat, India for Global Studios</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#3FA66B]/15 text-[#3FA66B] neu-pill">
                  100% Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4]">
                  <div className="text-xl font-extrabold text-[#E86A5B] font-display">&lt; 50ms</div>
                  <div className="text-[11px] text-[#6B6B6B] font-bold mt-0.5">AI Facial Matching</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4]">
                  <div className="text-xl font-extrabold text-[#1F1F1F] font-display">100%</div>
                  <div className="text-[11px] text-[#6B6B6B] font-bold mt-0.5">Biometric Privacy</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4]">
                  <div className="text-xl font-extrabold text-[#3FA66B] font-display">5MB+</div>
                  <div className="text-[11px] text-[#6B6B6B] font-bold mt-0.5">Chunked Resumable</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_4px_#D1CDC4]">
                  <div className="text-xl font-extrabold text-[#D9A441] font-display">GST 18%</div>
                  <div className="text-[11px] text-[#6B6B6B] font-bold mt-0.5">Tax Invoicing Built-in</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] text-xs text-[#6B6B6B] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Multi-tenant data isolation with cryptographic event authorization tokens.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOUR TECHNOLOGICAL PILLARS */}
      <section className="py-16 sm:py-20 bg-[#F3F1EC] border-b border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">CORE CAPABILITIES</span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] mt-2">
              4 Pillars of Get My Moment
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#6B6B6B]">
              Every tool a modern studio needs to elevate customer experience and scale revenues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pillar 1 */}
            <div className="neu-card p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E86A5B]/15 text-[#E86A5B] flex items-center justify-center mb-4 shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-[#1F1F1F]">1. Sub-50ms AI Biometric Face Recognition</h3>
                <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
                  Guests take a selfie at table tents or reception kiosks, and our high-speed YuNet & SFace neural network scans thousands of high-res photos to match their faces in under 1.5 seconds.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2DDD5] flex items-center gap-2 text-[11px] font-bold text-[#E86A5B]">
                <span>✓ Isolated Event-Scoped Vector Embeddings</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="neu-card p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#3FA66B]/15 text-[#3FA66B] flex items-center justify-center mb-4 shadow-sm">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-[#1F1F1F]">2. Wireless Camera Live FTP Sync</h3>
                <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
                  Connect your Sony, Canon, or Nikon cameras over Wi-Fi Direct. Photos shoot straight from the camera buffer into the cloud gallery with zero cables, giving guests instant live access.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2DDD5] flex items-center gap-2 text-[11px] font-bold text-[#3FA66B]">
                <span>✓ High-Concurrency Multi-Camera Ingest</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="neu-card p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D9A441]/15 text-[#8F6420] flex items-center justify-center mb-4 shadow-sm">
                  <Layers className="w-6 h-6 text-[#D9A441]" />
                </div>
                <h3 className="text-base font-extrabold text-[#1F1F1F]">3. All-in-One Studio Business OS</h3>
                <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
                  From CRM leads and WhatsApp custom package quotes to date-block calendars, milestone payment receipts, and automated 18% GST tax invoices with your authorized digital signature.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2DDD5] flex items-center gap-2 text-[11px] font-bold text-[#8F6420]">
                <span>✓ Real-Time Net Profit & Expense Ledger</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="neu-card p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 shadow-sm">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-[#1F1F1F]">4. Enterprise Privacy & Brand Customization</h3>
                <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
                  Your custom logo, round stamp, and watermark brand every client touchpoint. Guest face searches require cryptographic privacy consent with automated 30-day recycle bins.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2DDD5] flex items-center gap-2 text-[11px] font-bold text-purple-700">
                <span>✓ 60-Point OWASP & BOLA Hardened Defense</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. READY TO GROW YOUR STUDIO */}
      <section className="py-16 sm:py-20 bg-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E86A5B]/15 text-[#E86A5B] flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F]">
            Ready to Transform Your Photography Studio?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#6B6B6B] max-w-xl mx-auto">
            Experience the future of event photo delivery, client selection, and studio billing.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="btn-primary py-3.5 px-8 text-xs sm:text-sm font-bold shadow-lg shadow-[#E86A5B]/25"
            >
              Start Free Studio Trial
            </Link>
            <Link
              href="/contact"
              className="neu-btn-secondary py-3.5 px-7 text-xs sm:text-sm font-bold"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
