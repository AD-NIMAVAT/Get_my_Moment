'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Camera, Sparkles, ShieldCheck, Zap, QrCode, Cpu, ArrowRight, 
  CheckCircle2, Lock, Flame, IndianRupee, Layers, MessageSquare, 
  Heart, Users, Check, TrendingUp, Award, Crown, LayoutDashboard, Receipt
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex flex-col bg-[#FAF9F7] text-[#1F1F1F]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-28 lg:pb-32 border-b border-[#E8E5E2]">
        {/* Subtle Ambient Warm Radial Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#E86A5B]/10 via-[#D9A441]/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>
              {user ? `WELCOME BACK, ${(user.studio_name || 'STUDIO').toUpperCase()} • YOUR BUSINESS OS` : 'CAPTURE. SHARE. CHERISH. • THE COMPLETE STUDIO BUSINESS OS'}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-[#1F1F1F] max-w-5xl mx-auto leading-[1.15]">
            From First Lead Inquiry to{' '}
            <span className="text-[#E86A5B]">
              Instant AI Photo Delivery.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#6B6B6B] max-w-3xl mx-auto leading-relaxed font-normal">
            A warm, photo-focused Business OS for Indian wedding photographers. Run leads CRM, automated WhatsApp quotes, date booking calendar, and AI face recognition galleries in one seamless platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#E86A5B] hover:bg-[#C94F43] text-white font-bold text-base shadow-lg shadow-[#E86A5B]/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
                >
                  <Camera className="w-5 h-5 stroke-[2.5]" />
                  <span>Go to Studio Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard/finance"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-neutral-50 text-[#1F1F1F] border border-[#E8E5E2] font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Receipt className="w-4 h-4 text-[#E86A5B]" />
                  <span>Finance & Invoices</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login?mode=signup"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#E86A5B] hover:bg-[#C94F43] text-white font-bold text-base shadow-lg shadow-[#E86A5B]/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
                >
                  <Camera className="w-5 h-5 stroke-[2.5]" />
                  <span>Start Free Studio Trial</span>
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-neutral-50 text-[#1F1F1F] border border-[#E8E5E2] font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Photographer Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#E86A5B]" />
                </Link>
              </>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5E2] shadow-sm">
              <div className="text-2xl font-bold text-[#E86A5B]">100%</div>
              <div className="text-xs text-[#6B6B6B] mt-1 font-medium">Biometric Privacy</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5E2] shadow-sm">
              <div className="text-2xl font-bold text-[#1F1F1F]">&lt; 50ms</div>
              <div className="text-xs text-[#6B6B6B] mt-1 font-medium">AI Matching Latency</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5E2] shadow-sm">
              <div className="text-2xl font-bold text-[#3FA66B]">90%+</div>
              <div className="text-xs text-[#6B6B6B] mt-1 font-medium">Face Accuracy Filter</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5E2] shadow-sm">
              <div className="text-2xl font-bold text-[#D9A441]">₹0 Setup</div>
              <div className="text-xs text-[#6B6B6B] mt-1 font-medium">Instant Free Trial</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Signature Pillars */}
      <section id="killer-features" className="py-20 bg-white relative border-b border-[#E8E5E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">SIGNATURE CAPABILITIES</span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2">
              Engineered to Win Every Wedding Client
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-sm sm:text-base">
              Connect your business back-office with the guest's live event experience into one effortless workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#FAF9F7] p-8 rounded-3xl border border-[#E8E5E2] hover:border-[#F3A08F] shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center mb-6">
                <QrCode className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-[#E86A5B] uppercase">FEATURE 01</span>
              <h3 className="text-xl font-bold text-[#1F1F1F] mt-1 mb-2">One QR. Every Memory.</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed flex-1">
                One event QR code opens ceremony schedules, guest candid uploads, AI selfie face search (90%+ accuracy), and 1-tap WhatsApp photo sharing.
              </p>
              <div className="mt-6 pt-4 border-t border-[#E8E5E2] flex items-center gap-2 text-xs text-[#E86A5B] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#E86A5B]" />
                <span>Zero App Downloads • Instant Magic</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FAF9F7] p-8 rounded-3xl border border-[#E8E5E2] hover:border-[#F3A08F] shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 text-[#D9A441] flex items-center justify-center mb-6">
                <Layers className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-[#D9A441] uppercase">FEATURE 02</span>
              <h3 className="text-xl font-bold text-[#1F1F1F] mt-1 mb-2">Studio Business OS</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed flex-1">
                Full CRM lead tracking, automated quotation generators with deliverables, payment milestone tracking, and booking calendar date verifier.
              </p>
              <div className="mt-6 pt-4 border-t border-[#E8E5E2] flex items-center gap-2 text-xs text-[#D9A441] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#D9A441]" />
                <span>End-to-End Client Lifecycle</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FAF9F7] p-8 rounded-3xl border border-[#E8E5E2] hover:border-[#F3A08F] shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-[#3FA66B]/10 border border-[#3FA66B]/20 text-[#3FA66B] flex items-center justify-center mb-6">
                <IndianRupee className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-[#3FA66B] uppercase">FEATURE 03</span>
              <h3 className="text-xl font-bold text-[#1F1F1F] mt-1 mb-2">Client Selection Portal</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed flex-1">
                Clients select their favorite album photos with custom instructions. Photographers export finalized selections in 1-click for album printing.
              </p>
              <div className="mt-6 pt-4 border-t border-[#E8E5E2] flex items-center gap-2 text-xs text-[#3FA66B] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#3FA66B]" />
                <span>Fast 1-Click Album Selection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section id="pricing" className="py-20 bg-[#FAF9F7] relative border-b border-[#E8E5E2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">SIMPLE & TRANSPARENT PLANS</span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2">
              Built for Indian Photographers & Event Studios
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-sm sm:text-base">
              Start with a free event trial. Upgrade as your studio booking calendar grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Solo Pro */}
            <div className="p-7 rounded-3xl bg-white border border-[#E8E5E2] shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B6B6B] uppercase">SOLO PRO</span>
                <div className="text-3xl font-extrabold text-[#1F1F1F] mt-2">₹599 <span className="text-xs font-normal text-[#6B6B6B]">/mo</span></div>
                <p className="text-xs text-[#6B6B6B] mt-2">For independent wedding & portrait shooters.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 10 Active Events / month</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 100 GB Cloud Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> AI Face Recognition Search</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> WhatsApp Guest Delivery</li>
                </ul>
              </div>
              <Link href="/login?mode=signup" className="mt-8 w-full py-3 rounded-xl border border-[#E8E5E2] hover:bg-neutral-50 text-[#1F1F1F] text-xs font-bold text-center block transition-all">
                Get Started
              </Link>
            </div>

            {/* Studio Pro */}
            <div className="p-7 rounded-3xl bg-white border-2 border-[#E86A5B] shadow-xl shadow-primary-500/10 flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#E86A5B] text-white font-bold text-[10px] uppercase tracking-wider">
                MOST POPULAR
              </div>
              <div>
                <span className="text-xs font-bold text-[#E86A5B] uppercase">STUDIO PRO</span>
                <div className="text-3xl font-extrabold text-[#1F1F1F] mt-2">₹1,999 <span className="text-xs font-normal text-[#6B6B6B]">/mo</span></div>
                <p className="text-xs text-[#6B6B6B] mt-2">For established wedding studios.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 30 Active Events / month</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 500 GB Cloud Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Client Photo Selection Portal</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Studio Custom Watermark</li>
                </ul>
              </div>
              <Link href="/login?mode=signup" className="mt-8 w-full py-3 rounded-xl bg-[#E86A5B] hover:bg-[#C94F43] text-white text-xs font-bold text-center block shadow-md shadow-primary-500/25 transition-all">
                Start Studio Trial
              </Link>
            </div>

            {/* Studio OS Complete */}
            <div className="p-7 rounded-3xl bg-white border border-[#D9A441]/50 shadow-md flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-[#D9A441] text-white font-bold text-[10px] uppercase tracking-wider">
                COMPLETE OS
              </div>
              <div>
                <span className="text-xs font-bold text-[#D9A441] uppercase">STUDIO OS</span>
                <div className="text-3xl font-extrabold text-[#1F1F1F] mt-2">₹4,999 <span className="text-xs font-normal text-[#6B6B6B]">/mo</span></div>
                <p className="text-xs text-[#6B6B6B] mt-2">Complete photography business automation.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> Unlimited Events & Photos</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> 2 TB (2,048 GB) Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> Full CRM & WhatsApp Quotes</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> Booking Calendar Date Blocker</li>
                </ul>
              </div>
              <Link href="/login?mode=signup" className="mt-8 w-full py-3 rounded-xl bg-[#D9A441] hover:bg-[#B8842E] text-white text-xs font-bold text-center block shadow-md transition-all">
                Get Studio OS
              </Link>
            </div>

            {/* Enterprise VIP */}
            <div className="p-7 rounded-3xl bg-white border border-[#E8E5E2] shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B6B6B] uppercase">ENTERPRISE VIP</span>
                <div className="text-3xl font-extrabold text-[#1F1F1F] mt-2">₹9,999 <span className="text-xs font-normal text-[#6B6B6B]">/mo</span></div>
                <p className="text-xs text-[#6B6B6B] mt-2">For high-volume production cinema houses.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 10 TB Dedicated Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Multi-Crew & Assistant Logins</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Custom White-Label Domain</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Dedicated AI GPU Vector Node</li>
                </ul>
              </div>
              <Link href="/login?mode=signup" className="mt-8 w-full py-3 rounded-xl border border-[#E8E5E2] hover:bg-neutral-50 text-[#1F1F1F] text-xs font-bold text-center block transition-all">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
