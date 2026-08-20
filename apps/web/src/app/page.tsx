'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Camera, Sparkles, ShieldCheck, Zap, QrCode, Cpu, ArrowRight, 
  CheckCircle2, Lock, Flame, IndianRupee, Layers, MessageSquare, 
  Heart, Users, Check, TrendingUp, Award, Crown, LayoutDashboard, 
  Receipt, Wifi, Smartphone, Download, Share2, HelpCircle, ChevronDown,
  X, CheckCircle, Clock, RefreshCw, Star, Play, Laptop, HardDrive, ArrowUpRight
} from 'lucide-react';
import { LiveDemoModal } from '@/components/home/LiveDemoModal';

const PRODUCT_TABS = [
  {
    id: 'ai-delivery',
    title: 'AI Photo Delivery',
    subtitle: 'Guest Selfie & WhatsApp Sync',
    badge: 'Flagship Core',
    icon: Sparkles,
  },
  {
    id: 'studio-command',
    title: 'Studio Command Center',
    subtitle: 'Folder Hierarchy & Wi-Fi Sync',
    badge: 'Multi-Camera',
    icon: Camera,
  },
  {
    id: 'album-proofing',
    title: 'Client Album Selection',
    subtitle: 'Bride & Groom Proofing Portal',
    badge: 'Fast Delivery',
    icon: Heart,
  },
  {
    id: 'business-os',
    title: 'Studio Business OS',
    subtitle: 'CRM, Invoices & Calendar',
    badge: 'All-in-One',
    icon: LayoutDashboard,
  },
];

const FAQS = [
  {
    q: 'How do wedding photos get uploaded from the camera?',
    a: 'You have 3 effortless options: (1) Direct Wi-Fi FTP stream from Sony, Canon, or Nikon cameras straight to the cloud in real-time, (2) 5G mobile burst uploads from your phone or SD card reader, or (3) Web drag-and-drop from your studio laptop.'
  },
  {
    q: 'Do wedding guests need to install an app to find their photos?',
    a: 'No app download is required! Guests simply point their phone camera at the Table QR standee, take a 1-second selfie in their browser, and their matched portraits appear in ~1.5 seconds.'
  },
  {
    q: 'How does automated WhatsApp photo delivery work?',
    a: 'When guests scan the QR code and register their mobile number, our system can instantly send their personalized photo gallery link and matched highlights directly to their WhatsApp chat with your studio branding.'
  },
  {
    q: 'How fast is the AI face recognition on large weddings with 5,000+ photos?',
    a: 'Our sub-50ms vector search engine uses 512-dimensional face embeddings to query thousands of photos simultaneously. A guest selfie typically returns all matching photos in approximately 1.5 seconds.'
  },
  {
    q: 'Is guest biometric data private and secure?',
    a: '100% yes. Facial vector embeddings are isolated strictly per event foreign key. Guest search selfies require explicit biometric consent and are never shared across studios, sold, or used for model retraining.'
  },
  {
    q: 'How does the free trial work?',
    a: 'You can create your account for free with zero credit card required. You get 5 GB cloud storage and full access to test AI face matching, camera Wi-Fi sync, client album proofing, and the CRM.'
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState('ai-delivery');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="flex-1 flex flex-col bg-[#F3F1EC] text-[#1F1F1F] selection:bg-[#E86A5B] selection:text-white">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (AI Photo Delivery Focus)                                  */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32 border-b border-[#E2DDD5]">
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,1200px)] h-[min(50vh,600px)] bg-gradient-to-tr from-[#E86A5B]/15 via-[#D9A441]/10 to-transparent blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20 mb-6 shadow-sm neu-pill">
              <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
              <span>AI-POWERED PHOTO DELIVERY &amp; STUDIO BUSINESS OS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-display font-extrabold tracking-tight text-[#1F1F1F] leading-[1.12]">
              AI-Powered Photo Delivery for{' '}
              <span className="text-[#E86A5B]">Wedding Photographers.</span>
            </h1>

            {/* Subtext explaining Upload -> QR -> Selfie -> AI Search -> WhatsApp */}
            <p className="mt-6 text-sm sm:text-base lg:text-lg text-[#6B6B6B] max-w-2xl sm:max-w-3xl mx-auto leading-relaxed font-normal">
              Stop sharing messy Google Drive folders. Guests scan a table QR code, snap a selfie, and instantly get every single photo they appear in within <strong>1.5 seconds</strong>. Zero manual sorting. Zero post-wedding chaos.
            </p>

            {/* Hero CTAs */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto btn-primary py-3.5 px-8 text-sm font-bold shadow-lg shadow-[#E86A5B]/25 flex items-center justify-center gap-2.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Go to Studio Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="w-full sm:w-auto neu-btn-secondary py-3.5 px-7 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 text-[#E86A5B] fill-current" />
                    <span>Try Live Demo Wedding</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login?mode=signup"
                    className="w-full sm:w-auto btn-primary py-3.5 px-8 text-sm font-bold shadow-lg shadow-[#E86A5B]/25 flex items-center justify-center gap-2.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Free Studio Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="w-full sm:w-auto neu-btn-secondary py-3.5 px-7 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 text-[#E86A5B] fill-current" />
                    <span>Try Live Demo Wedding</span>
                  </button>
                </>
              )}
            </div>

            {/* Value Guarantees */}
            <div className="mt-5 flex items-center justify-center gap-6 text-[11px] sm:text-xs text-[#6B6B6B] flex-wrap">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>5 GB Free Storage</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>No Credit Card Required</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Setup in 2 Minutes</span>
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HERO VISUAL: Dual Interactive Product Mockup                             */}
          {/* ========================================================================= */}
          <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
            <div className="neu-card p-4 sm:p-6 rounded-3xl relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Card: Photographer Wi-Fi Stream */}
                <div className="lg:col-span-5 bg-[#FAF9F7] rounded-2xl p-5 border border-[#E8E5E2] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                        Live Camera Stream
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                      Sony A7 IV • Wi-Fi
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F3F1EC] border border-[#E2DDD5] space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>Event:</span>
                      <span className="font-bold text-[#1F1F1F]">Mehta Wedding</span>
                    </div>
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>Active Folder:</span>
                      <span className="font-bold text-[#E86A5B]">01_Mandap</span>
                    </div>
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>Synced Photos:</span>
                      <span className="font-bold text-emerald-700">1,248 Images</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#6B6B6B] flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#E86A5B]" />
                    <span>Photos stream straight from shutter click into AI vector index!</span>
                  </div>
                </div>

                {/* Right Card: Guest AI Selfie Match Experience */}
                <div className="lg:col-span-7 bg-[#FAF9F7] rounded-2xl p-5 border border-[#E8E5E2] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#E86A5B]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                        Guest AI Face Match (0.048s)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      98.4% Confidence
                    </span>
                  </div>

                  {/* Matched Photos Strip */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&auto=format&fit=crop&q=80",
                    ].map((imgUrl, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden aspect-[4/5] border border-[#E8E5E2] shadow-sm">
                        <img src={imgUrl} alt="Match" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1 rounded font-mono">
                          Match #{i+1}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#6B6B6B] font-medium">Found 24 photos for Priya in 1.5s</span>
                    <button
                      onClick={() => setIsDemoModalOpen(true)}
                      className="text-xs font-bold text-[#E86A5B] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Test Live Experience</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN PRODUCT FLOW (The 5-Step Visual Journey)                           */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-[#FAF9F7] border-b border-[#E2DDD5] relative">
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">THE 5-STEP JOURNEY</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              How Get My Moment Delivers Every Wedding Photo Automatically
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-xs sm:text-base">
              From camera click to guest WhatsApp in 5 simple steps with zero post-wedding sorting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Step 1 */}
            <div className="neu-card p-6 rounded-3xl flex flex-col justify-between relative group hover:scale-[1.02] transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-[#E86A5B] uppercase tracking-wider block mb-1">
                  STEP 01
                </span>
                <h3 className="text-base font-bold text-[#1F1F1F] mb-1.5">
                  Shoot &amp; Upload
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Stream photos live via Camera Wi-Fi FTP, mobile burst, or web drag &amp; drop into ceremony folders.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="neu-card p-6 rounded-3xl flex flex-col justify-between relative group hover:scale-[1.02] transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 text-[#D9A441] flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-[#D9A441] uppercase tracking-wider block mb-1">
                  STEP 02
                </span>
                <h3 className="text-base font-bold text-[#1F1F1F] mb-1.5">
                  Guest Scans QR
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Guests scan beautiful table standee QR codes at the venue. Opens instantly in mobile browser without installing any app.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="neu-card p-6 rounded-3xl flex flex-col justify-between relative group hover:scale-[1.02] transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block mb-1">
                  STEP 03
                </span>
                <h3 className="text-base font-bold text-[#1F1F1F] mb-1.5">
                  1-Second Selfie
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Guest snaps a quick selfie. Biometric face consent is recorded securely and safely.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="neu-card p-6 rounded-3xl flex flex-col justify-between relative group hover:scale-[1.02] transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block mb-1">
                  STEP 04
                </span>
                <h3 className="text-base font-bold text-[#1F1F1F] mb-1.5">
                  AI Vector Match
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Our sub-50ms vector engine scans 10,000+ photos to locate all guest portraits and group shots in ~1.5s.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="neu-card p-6 rounded-3xl flex flex-col justify-between relative group hover:scale-[1.02] transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block mb-1">
                  STEP 05
                </span>
                <h3 className="text-base font-bold text-[#1F1F1F] mb-1.5">
                  WhatsApp &amp; HD Save
                </h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">
                  Guests download HD photos with your studio branding or receive automated WhatsApp gallery links!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PAIN POINT COMPARISON (The Old Way vs. The Get My Moment Way)          */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-[#F3F1EC] border-b border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">THE WORKLOAD TRANSFORMATION</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Why 500+ Indian Studios Stopped Using Google Drive
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-xs sm:text-base">
              Comparing traditional chaotic photo delivery with automated AI face delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* The Old Way Card */}
            <div className="bg-[#FAF9F7] p-6 sm:p-8 rounded-3xl border border-rose-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
                  ✕
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F1F1F]">The Old Frustrating Way</h3>
                  <span className="text-xs text-rose-600 font-semibold">Slow, chaotic &amp; zero studio growth</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#6B6B6B] pt-2">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>10,000 wedding photos dumped into a giant, unorganized Google Drive link.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Relatives messaging studio 3 weeks later: <em>&quot;Where are our Haldi photos?&quot;</em></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Wasting 15+ hours manually finding and emailing individual guest portraits.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Zero new client inquiries generated; your studio branding is lost.</span>
                </li>
              </ul>
            </div>

            {/* The Get My Moment Way Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/80 shadow-xl shadow-emerald-500/10 space-y-4 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                Zero Workload
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F1F1F]">The Get My Moment AI Way</h3>
                  <span className="text-xs text-emerald-700 font-semibold">Instant, self-serve &amp; automated leads</span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[#1F1F1F] pt-2">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Self-Serve AI Search:</strong> Every guest finds all their photos in 1.5 seconds by scanning a table QR code.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Automated WhatsApp Delivery:</strong> High-res photo links sent directly to guest phone with your watermark.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Zero Post-Event Delay:</strong> Deliver entire wedding gallery on the reception night before you pack up.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Automated High-Intent Leads:</strong> Collect hundreds of guest phone numbers as verified leads for future weddings.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 'ONE QR. EVERY MEMORY.' FLAGSHIP SPOTLIGHT                             */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-[#FAF9F7] border-b border-[#E2DDD5] relative overflow-hidden">
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold text-[#E86A5B] bg-[#E86A5B]/10 border border-[#E86A5B]/20 neu-pill">
                <QrCode className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>FLAGSHIP CAPABILITY</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#1F1F1F] tracking-tight leading-tight">
                One QR. <br />
                <span className="text-[#E86A5B]">Every Memory.</span>
              </h2>

              <p className="text-sm sm:text-base text-[#6B6B6B] leading-relaxed">
                Place one elegant QR code standee on guest tables. It powers 4 vital guest and client workflows simultaneously:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-[#E8E5E2] shadow-sm">
                  <span className="text-xs font-bold text-[#E86A5B] block mb-1">01. AI Selfie Face Match</span>
                  <p className="text-xs text-[#6B6B6B]">Guests find their portraits across Haldi, Mandap, and Reception in seconds.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E8E5E2] shadow-sm">
                  <span className="text-xs font-bold text-[#D9A441] block mb-1">02. Ceremony Schedules</span>
                  <p className="text-xs text-[#6B6B6B]">Live itinerary, venue map, and dress code right on guests&apos; smartphones.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E8E5E2] shadow-sm">
                  <span className="text-xs font-bold text-purple-600 block mb-1">03. Guest Candid Uploads</span>
                  <p className="text-xs text-[#6B6B6B]">Collect uncensored mobile candids from friends and family into one community gallery.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E8E5E2] shadow-sm">
                  <span className="text-xs font-bold text-emerald-600 block mb-1">04. Client Album Proofing</span>
                  <p className="text-xs text-[#6B6B6B]">Bride and groom review and heart favorites with custom album designer notes.</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Table Standee Visual */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="neu-card p-6 sm:p-8 rounded-3xl max-w-md w-full text-center space-y-5 relative">
                <div className="w-16 h-16 rounded-2xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center mx-auto shadow-sm">
                  <QrCode className="w-10 h-10" />
                </div>

                <div>
                  <span className="text-[10px] font-mono text-[#6B6B6B] uppercase font-bold tracking-widest block mb-1">
                    GET MY MOMENT • LIVE EVENT QR
                  </span>
                  <h3 className="text-xl font-display font-extrabold text-[#1F1F1F]">
                    Mehta &amp; Sharma Grand Wedding
                  </h3>
                  <p className="text-xs text-[#6B6B6B] mt-1">
                    Scan with Phone Camera to Find Your Photos &amp; Selfies
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] text-xs font-bold text-[#1F1F1F] flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E86A5B]" />
                  <span>Sub-50ms Vector Face Recognition Active</span>
                </div>

                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full btn-primary py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Try Demo Guest Scan Experience</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE PRODUCT UI SHOWCASE                                        */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-[#F3F1EC] border-b border-[#E2DDD5]">
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">PRODUCT UI WALKTHROUGH</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Engineered Specifically for Wedding Studios
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-xs sm:text-base">
              Explore the four core modules that power modern photography businesses.
            </p>
          </div>

          {/* Product Tabs */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {PRODUCT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeProductTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveProductTab(tab.id)}
                  className={`px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-[#E86A5B] text-white shadow-lg shadow-[#E86A5B]/30 scale-[1.02]'
                      : 'bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.title}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Display */}
          <div className="neu-card p-6 sm:p-8 rounded-3xl max-w-5xl mx-auto">
            {activeProductTab === 'ai-delivery' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#E86A5B] uppercase">FLAGSHIP ENGINE</span>
                  <h3 className="text-2xl font-display font-extrabold text-[#1F1F1F]">Instant AI Facial Recognition</h3>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Our sub-50ms vector engine matches guest selfies against 10,000+ photos in ~1.5s with 90%+ confidence filter. Guests receive their photos with your studio logo watermark.
                  </p>
                  <ul className="space-y-2 text-xs font-medium text-[#1F1F1F]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Sub-50ms Vector DB Indexing</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 1-Tap HD Download &amp; WhatsApp Share</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 100% Isolated per Event (Zero Data Leakage)</li>
                  </ul>
                </div>
                <div className="bg-[#FAF9F7] rounded-2xl p-4 border border-[#E8E5E2] shadow-inner text-center">
                  <div className="grid grid-cols-3 gap-2">
                    <img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&auto=format&fit=crop&q=80" alt="Sample" className="rounded-xl aspect-square object-cover" />
                    <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80" alt="Sample" className="rounded-xl aspect-square object-cover" />
                    <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80" alt="Sample" className="rounded-xl aspect-square object-cover" />
                  </div>
                  <span className="text-[11px] font-mono text-[#6B6B6B] block mt-3 font-semibold">
                    Guest Gallery UI • Mobile Optimized • Zero Lag
                  </span>
                </div>
              </div>
            )}

            {activeProductTab === 'studio-command' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#E86A5B] uppercase">STUDIO CONTROL</span>
                  <h3 className="text-2xl font-display font-extrabold text-[#1F1F1F]">Folder Hierarchy &amp; Camera Ingest</h3>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Organize wedding shoots by ceremony functions (`01_Haldi`, `02_Mandap`, `03_Reception`). Stream camera clicks cable-free over Wi-Fi directly into the target ceremony folder.
                  </p>
                  <ul className="space-y-2 text-xs font-medium text-[#1F1F1F]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Multi-Folder Nested Architecture</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Sony / Canon / Nikon Wi-Fi FTP Direct Sync</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 1-Click Multi-Photo Move &amp; Counter Reconciliation</li>
                  </ul>
                </div>
                <div className="bg-[#FAF9F7] rounded-2xl p-5 border border-[#E8E5E2] font-mono text-xs space-y-2">
                  <div className="flex justify-between p-2 rounded bg-white border border-[#E8E5E2]">
                    <span>📁 01_Mandap (Ceremony)</span>
                    <span className="text-[#E86A5B] font-bold">840 Photos</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white border border-[#E8E5E2]">
                    <span>📁 02_Haldi (Ceremony)</span>
                    <span className="text-[#E86A5B] font-bold">520 Photos</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-white border border-[#E8E5E2]">
                    <span>📁 03_Reception (Ceremony)</span>
                    <span className="text-[#E86A5B] font-bold">960 Photos</span>
                  </div>
                </div>
              </div>
            )}

            {activeProductTab === 'album-proofing' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#E86A5B] uppercase">CLIENT PROOFING</span>
                  <h3 className="text-2xl font-display font-extrabold text-[#1F1F1F]">Client Album Selection Portal</h3>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Clients review their wedding photos at home, heart their favorites, and leave specific instructions for the album designer (e.g. &quot;Use on cover page spread&quot;).
                  </p>
                  <ul className="space-y-2 text-xs font-medium text-[#1F1F1F]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> 1-Click Heart Favorite Selection</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Album Designer Notes &amp; Spreads</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Export Finalized List for Album Printing</li>
                  </ul>
                </div>
                <div className="bg-[#FAF9F7] rounded-2xl p-5 border border-[#E8E5E2] text-center space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold pb-2 border-b border-[#E8E5E2]">
                    <span>Selected: 120 / 1,500</span>
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Ready to Submit</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative rounded-xl overflow-hidden aspect-square border-2 border-[#E86A5B]">
                      <img src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&auto=format&fit=crop&q=80" alt="Album" className="w-full h-full object-cover" />
                      <Heart className="w-4 h-4 text-white fill-current absolute top-1.5 right-1.5" />
                    </div>
                    <div className="relative rounded-xl overflow-hidden aspect-square border-2 border-[#E86A5B]">
                      <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80" alt="Album" className="w-full h-full object-cover" />
                      <Heart className="w-4 h-4 text-white fill-current absolute top-1.5 right-1.5" />
                    </div>
                    <div className="relative rounded-xl overflow-hidden aspect-square border border-[#E8E5E2]">
                      <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop&q=80" alt="Album" className="w-full h-full object-cover opacity-70" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeProductTab === 'business-os' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#E86A5B] uppercase">STUDIO GROWTH</span>
                  <h3 className="text-2xl font-display font-extrabold text-[#1F1F1F]">Photographer Business OS</h3>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                    Streamline your entire back-office with Leads CRM, automated quotation generators, GST tax invoicing (SAC 9983), and double-booking prevention calendar.
                  </p>
                  <ul className="space-y-2 text-xs font-medium text-[#1F1F1F]">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Leads CRM &amp; WhatsApp Quotations</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> GST Tax Invoices with UPI Scan-to-Pay QR</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Date Booking Calendar &amp; Crew Call Sheets</li>
                  </ul>
                </div>
                <div className="bg-[#FAF9F7] rounded-2xl p-5 border border-[#E8E5E2] space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-white border border-[#E8E5E2] flex justify-between items-center">
                    <span>Tax Invoice #INV-2026-004</span>
                    <span className="text-emerald-700 font-bold">₹1,85,000 (Paid)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#E8E5E2] flex justify-between items-center">
                    <span>CRM Lead: Sharma Wedding</span>
                    <span className="text-[#D9A441] font-bold">Quote Sent</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PHOTOGRAPHER BUSINESS OS (Secondary Tier Benefit Grid)                 */}
      {/* ========================================================================= */}
      <section id="business-os" className="py-16 sm:py-24 bg-[#FAF9F7] border-b border-[#E2DDD5]">
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">COMPLETE BUSINESS AUTOMATION</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Photographer Business OS
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-xs sm:text-base">
              Beyond AI photo delivery, run your photography studio operations in one single dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="neu-card p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Leads &amp; Inquiries CRM</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Capture wedding leads from Instagram, QR codes, and phone calls. Track stages from inquiry to advance payment.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="neu-card p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 text-[#D9A441] flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Automated PDF Quotations</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Generate professional PDF quotations with candid shooters, drone pilots, and album deliverables in 30 seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="neu-card p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Date Booking Calendar</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Prevent date collisions. Visualize booked auspicious wedding dates and assign multi-camera teams.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="neu-card p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
                <IndianRupee className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1F1F1F]">GST Tax Invoices &amp; UPI QR</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Issue SAC 9983 photography tax invoices with digital stamp, GST breakdown, and instant UPI Scan-to-Pay QR.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="neu-card p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Crew Field Mobile Portal</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Freelance photographers log in via phone, view assigned ceremonies, and switch live camera Wi-Fi routing in 1-tap.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="neu-card p-6 sm:p-7 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Custom Studio Branding</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Watermark all client and guest downloads with your studio logo. Drive viral word-of-mouth with every shared photo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CLEAN 3-TIER PRICING TABLE                                             */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-16 sm:py-24 bg-[#F3F1EC] border-b border-[#E2DDD5]">
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">SIMPLE &amp; TRANSPARENT PLANS</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Built for Indian Wedding Photographers &amp; Studios
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-xs sm:text-base">
              Start with a free trial. Upgrade as your studio booking calendar grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Solo Pro */}
            <div className="neu-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">SOLO PRO</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-[#1F1F1F] mt-2">
                  ₹599 <span className="text-xs font-normal text-[#6B6B6B]">/month</span>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-2">For independent wedding &amp; portrait photographers.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 10 Active Events / month</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 100 GB Cloud Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> AI Face Recognition Search</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Automated WhatsApp Delivery</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Camera Wi-Fi FTP Direct Ingest</li>
                </ul>
              </div>

              <Link
                href="/login?mode=signup"
                className="mt-8 w-full neu-btn-secondary py-3 text-xs font-bold text-center block"
              >
                Start Solo Trial
              </Link>
            </div>

            {/* Studio Pro (RECOMMENDED / MOST POPULAR) */}
            <div className="neu-card p-7 sm:p-8 rounded-3xl border-2 border-[#E86A5B] shadow-xl shadow-[#E86A5B]/15 flex flex-col justify-between relative scale-[1.02]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#E86A5B] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md">
                ⭐ MOST POPULAR • RECOMMENDED
              </div>

              <div>
                <span className="text-xs font-bold text-[#E86A5B] uppercase tracking-wider">STUDIO PRO</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-[#1F1F1F] mt-2">
                  ₹1,999 <span className="text-xs font-normal text-[#6B6B6B]">/month</span>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-2">For established wedding &amp; event studios.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2 font-bold"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 30 Active Events / month</li>
                  <li className="flex items-center gap-2 font-bold"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> 500 GB Cloud Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Client Album Selection Portal</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Custom Studio Watermarking</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#E86A5B]" /> Leads CRM &amp; Quotations</li>
                </ul>
              </div>

              <Link
                href="/login?mode=signup"
                className="mt-8 w-full btn-primary py-3.5 text-xs font-bold text-center block shadow-lg shadow-[#E86A5B]/25"
              >
                Start Studio Pro Trial
              </Link>
            </div>

            {/* Studio OS Complete */}
            <div className="neu-card p-7 sm:p-8 rounded-3xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#D9A441] uppercase tracking-wider">STUDIO OS</span>
                <div className="text-3xl sm:text-4xl font-display font-black text-[#1F1F1F] mt-2">
                  ₹4,999 <span className="text-xs font-normal text-[#6B6B6B]">/month</span>
                </div>
                <p className="text-xs text-[#6B6B6B] mt-2">Complete end-to-end studio automation.</p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#1F1F1F]">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> Unlimited Events &amp; Photos</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> 2,000 GB (2 TB) Cloud Storage</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> GST Tax Invoices &amp; UPI QR</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> Date Booking Calendar OS</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#D9A441]" /> Multi-Crew Field Logins</li>
                </ul>
              </div>

              <Link
                href="/login?mode=signup"
                className="mt-8 w-full neu-btn-secondary py-3 text-xs font-bold text-center block"
              >
                Get Studio OS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. TRUST, BIOMETRIC PRIVACY & SECURITY                                    */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-[#FAF9F7] border-b border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">SECURITY &amp; COMPLIANCE</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Enterprise Privacy &amp; Data Protection
            </h2>
            <p className="mt-3 text-[#6B6B6B] text-xs sm:text-base">
              Built on strict tenant-isolation standards with zero cross-event biometric data leakage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="neu-card p-6 rounded-3xl space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Event Vector Isolation</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Facial embeddings are scoped strictly to individual event foreign keys. Cross-event matching is architecturally impossible.
              </p>
            </div>

            <div className="neu-card p-6 rounded-3xl space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#E86A5B]/10 text-[#E86A5B] flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Explicit Biometric Consent</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Guests must provide explicit consent before their selfie vector is queried. Compliant with privacy regulations.
              </p>
            </div>

            <div className="neu-card p-6 rounded-3xl space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Encrypted Cloud Storage</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                All original high-res JPEG/RAW photos and thumbnails are saved with cryptographic SHA-256 deduplication.
              </p>
            </div>

            <div className="neu-card p-6 rounded-3xl space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Zero Data Selling</h3>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Your client photos and guest phone numbers belong 100% to your studio. We never sell or monetize user data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. REAL PHOTOGRAPHER TESTIMONIALS                                         */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-[#F3F1EC] border-b border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">STUDIO REVIEWS</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Trusted by Leading Wedding Photography Studios
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="neu-card p-7 rounded-3xl flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs sm:text-sm text-[#1F1F1F] leading-relaxed italic">
                &quot;Get My Moment completely changed our post-event life. At our last 800-guest wedding in Ahmedabad, 450 guests found their photos in under 2 hours without sending us a single WhatsApp message.&quot;
              </p>
              <div className="pt-3 border-t border-[#E8E5E2]">
                <span className="text-xs font-bold text-[#1F1F1F] block">Kavya Patel</span>
                <span className="text-[10px] text-[#E86A5B] font-bold block">The Candid Story Studio • Ahmedabad</span>
              </div>
            </div>

            <div className="neu-card p-7 rounded-3xl flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs sm:text-sm text-[#1F1F1F] leading-relaxed italic">
                &quot;The Client Album Selection portal alone saved us 20 hours of endless client discussions. The bride selected her 150 favorites with spread notes in one evening.&quot;
              </p>
              <div className="pt-3 border-t border-[#E8E5E2]">
                <span className="text-xs font-bold text-[#1F1F1F] block">Rohan Mehta</span>
                <span className="text-[10px] text-[#E86A5B] font-bold block">Royal Shutter Cinema • Mumbai</span>
              </div>
            </div>

            <div className="neu-card p-7 rounded-3xl flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <p className="text-xs sm:text-sm text-[#1F1F1F] leading-relaxed italic">
                &quot;We booked 3 new destination weddings just from the QR code leads collected at a reception. The automated WhatsApp quote generator is pure magic.&quot;
              </p>
              <div className="pt-3 border-t border-[#E8E5E2]">
                <span className="text-xs font-bold text-[#1F1F1F] block">Vikram Rathore</span>
                <span className="text-[10px] text-[#E86A5B] font-bold block">Signature Clicks • Jaipur</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. COMPREHENSIVE PHOTOGRAPHER FAQS                                        */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 sm:py-24 bg-[#FAF9F7] border-b border-[#E2DDD5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] mt-2 tracking-tight">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className="neu-card rounded-2xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[#1F1F1F]">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#E86A5B] shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-5 text-xs text-[#6B6B6B] leading-relaxed border-t border-[#E2DDD5] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. FINAL HIGH-CONVERSION CTA                                             */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-[#E86A5B] via-[#DF5E4F] to-[#C94F43] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>JOIN 500+ FORWARD-THINKING INDIAN STUDIOS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Your next wedding should <br className="hidden sm:inline" />
            deliver itself.
          </h2>

          <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
            Stop sorting photos manually. Start delivering unforgettable guest experiences with instant AI face matching today.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=signup"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#1F1F1F] font-bold text-sm shadow-2xl hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-[#E86A5B]" />
              <span>Start Free Studio Trial</span>
              <ArrowRight className="w-4 h-4 text-[#E86A5B]" />
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-black/20 hover:bg-black/30 border border-white/30 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Live Demo</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-white/80 flex-wrap">
            <span>✓ 5 GB Free Forever</span>
            <span>✓ No Credit Card Required</span>
            <span>✓ Cancel Anytime</span>
          </div>
        </div>
      </section>

      {/* Interactive Live Demo Modal */}
      <LiveDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
