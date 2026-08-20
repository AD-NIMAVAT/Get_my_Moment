'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Camera, Sparkles, ShieldCheck, Heart, ArrowRight, 
  MessageSquare, ChevronDown, Instagram, Youtube, Mail, 
  Lock, CheckCircle2, QrCode, Cpu, Layers, HardDrive, Play
} from 'lucide-react';
import { LiveDemoModal } from '@/components/home/LiveDemoModal';

interface FooterAccordionSection {
  title: string;
  links: { label: string; href: string; isExternal?: boolean }[];
}

export function Footer() {
  const pathname = usePathname() || '';
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({});

  // 1. Hide Footer on Guest Galleries, Client Album Selection & Field Crew Portals
  if (
    pathname.startsWith('/e/') || 
    pathname.startsWith('/selection/') || 
    pathname.startsWith('/crew') ||
    pathname === '/login' ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const footerSections: { [key: string]: FooterAccordionSection } = {
    platform: {
      title: 'Platform & AI',
      links: [
        { label: 'How It Works', href: '/#how-it-works' },
        { label: 'AI Facial Recognition', href: '/#how-it-works' },
        { label: 'Camera Wi-Fi FTP Ingest', href: '/#how-it-works' },
        { label: 'One QR. Every Memory', href: '/#how-it-works' },
        { label: 'Client Album Selection', href: '/#business-os' },
      ]
    },
    studioOs: {
      title: 'Studio Business OS',
      links: [
        { label: 'Events Dashboard', href: '/dashboard' },
        { label: 'Leads & Inquiries CRM', href: '/dashboard/crm' },
        { label: 'GST Tax Invoices & UPI', href: '/dashboard/finance' },
        { label: 'Date Booking Calendar', href: '/dashboard/calendar' },
        { label: 'Crew Field Mobile Portal', href: '/crew/login' },
      ]
    },
    company: {
      title: 'Company & Support',
      links: [
        { label: 'About Get My Moment', href: '/about' },
        { label: 'Pricing Plans', href: '/#pricing' },
        { label: 'Frequently Asked Questions', href: '/#faq' },
        { label: 'Contact Studio Support', href: '/contact' },
        { label: 'Super Admin Gateway', href: '/admin/login' },
      ]
    },
    connect: {
      title: 'Connect & Community',
      links: [
        { label: 'Instagram Community', href: 'https://instagram.com', isExternal: true },
        { label: 'WhatsApp Studio Help', href: 'https://wa.me', isExternal: true },
        { label: 'YouTube Tutorials', href: 'https://youtube.com', isExternal: true },
        { label: 'contact@getmymoment.fun', href: 'mailto:contact@getmymoment.fun', isExternal: true },
      ]
    }
  };

  return (
    <>
      <footer className="bg-[#121316] text-[#FAF9F7] relative overflow-hidden border-t border-white/10 selection:bg-[#E86A5B] selection:text-white" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Get My Moment Footer</h2>

        {/* Ambient Warm Photographic Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(95vw,1400px)] h-80 bg-gradient-to-b from-[#E86A5B]/10 via-[#D9A441]/5 to-transparent blur-[120px] pointer-events-none" />

        {/* ========================================================================= */}
        {/* SECTION A: EMOTIONAL BRAND HERO CTA                                       */}
        {/* ========================================================================= */}
        <div className="border-b border-white/10 relative z-10">
          <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12 py-16 sm:py-24 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/10 text-white/90 border border-white/15 mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
              <span>THE FUTURE OF WEDDING PHOTOGRAPHY DELIVERY</span>
            </div>

            <h3 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
              Your moments. <br />
              Your memories. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F07465] via-[#E86A5B] to-[#D9A441]">
                Forever.
              </span>
            </h3>

            <p className="mt-6 text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              Stop sharing messy Google Drive folders. Deliver unforgettable client experiences with sub-50ms AI face recognition and complete studio business automation.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login?mode=signup"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F07465] to-[#D95748] hover:from-[#F38578] hover:to-[#E26354] text-white font-bold text-sm shadow-xl shadow-[#E86A5B]/25 transition-all flex items-center justify-center gap-2.5 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Start Free Studio Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 text-[#E86A5B] fill-current" />
                <span>Try Live Demo Wedding</span>
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-[11px] sm:text-xs text-neutral-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>5 GB Free Storage</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>No Credit Card Required</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Setup in 2 Minutes</span>
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION B: 5-COLUMN DESKTOP GRID / SECTION C: MOBILE ACCORDIONS           */}
        {/* ========================================================================= */}
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12 py-12 sm:py-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Column 1: Brand & Trust Badge */}
            <div className="lg:col-span-4 space-y-4">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#EE7E6F] via-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-lg shadow-[#E86A5B]/30 group-hover:scale-105 transition-all duration-300 shrink-0">
                  <Camera className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white leading-none">
                    Get My Moment
                  </span>
                  <span className="text-[9px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5">
                    STUDIO OS &amp; AI DELIVERY
                  </span>
                </div>
              </Link>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm">
                The next-generation AI photo delivery platform and studio business operating system engineered specifically for Indian wedding photographers.
              </p>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs text-neutral-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Event-Scoped Biometric Privacy</span>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-neutral-300">
                  <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Encrypted Cloud Storage with SHA-256</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Columns (hidden on mobile, shown on md/lg) */}
            <div className="hidden md:grid md:grid-cols-4 lg:col-span-8 gap-8">
              {/* Col 2: Platform */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {footerSections.platform.title}
                </h4>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {footerSections.platform.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => setIsDemoModalOpen(true)}
                      className="text-xs text-[#E86A5B] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Try Demo Wedding</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 3: Studio Business OS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {footerSections.studioOs.title}
                </h4>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {footerSections.studioOs.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 4: Company & Support */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {footerSections.company.title}
                </h4>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {footerSections.company.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Col 5: Connect */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {footerSections.connect.title}
                </h4>
                <ul className="space-y-2 text-xs text-neutral-400">
                  {footerSections.connect.links.map((link, idx) => (
                    <li key={idx}>
                      <a
                        href={link.href}
                        target={link.isExternal ? '_blank' : undefined}
                        rel={link.isExternal ? 'noopener noreferrer' : undefined}
                        className="hover:text-[#E86A5B] transition-colors flex items-center gap-1.5"
                      >
                        <span>{link.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mobile Accessible Accordions (shown only on mobile < md) */}
            <div className="md:hidden space-y-3 pt-2">
              {Object.entries(footerSections).map(([key, section]) => {
                const isOpen = !!openAccordions[key];
                return (
                  <div key={key} className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03]">
                    <button
                      onClick={() => toggleAccordion(key)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-white cursor-pointer"
                      aria-expanded={isOpen}
                      aria-controls={`footer-accordion-${key}`}
                    >
                      <span>{section.title}</span>
                      <ChevronDown className={`w-4 h-4 text-[#E86A5B] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div id={`footer-accordion-${key}`} className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                        <ul className="space-y-2 text-xs text-neutral-400">
                          {section.links.map((link, idx) => (
                            <li key={idx}>
                              {link.isExternal ? (
                                <a
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-[#E86A5B] transition-colors block py-1"
                                >
                                  {link.label}
                                </a>
                              ) : (
                                <Link
                                  href={link.href}
                                  className="hover:text-[#E86A5B] transition-colors block py-1"
                                >
                                  {link.label}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION D: LEGAL & COPYRIGHT BAR                                          */}
        {/* ========================================================================= */}
        <div className="border-t border-white/10 bg-black/40 relative z-10">
          <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span>© {new Date().getFullYear()} Get My Moment. All rights reserved.</span>
              <span className="hidden sm:inline text-neutral-600">•</span>
              <span className="hidden sm:inline text-[11px] text-neutral-500">Made for Indian Wedding Studios</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] sm:text-xs font-medium text-neutral-400 flex-wrap justify-center">
              <Link href="/about#privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <span className="text-neutral-700">•</span>
              <Link href="/about#terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <span className="text-neutral-700">•</span>
              <Link href="/about#biometric" className="hover:text-white transition-colors">
                Biometric Consent
              </Link>
              <span className="text-neutral-700">•</span>
              <Link href="/contact" className="hover:text-white transition-colors">
                Studio Support
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Live Demo Modal */}
      <LiveDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </>
  );
}

export default Footer;
