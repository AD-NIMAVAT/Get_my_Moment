'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Camera, ShieldCheck, HardDrive, ChevronDown, 
  ArrowRight, Heart, Mail
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

  // Hide Footer on Guest Galleries, Client Album Selection & Field Crew Portals
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
    product: {
      title: 'Product & AI',
      links: [
        { label: 'How It Works', href: '/#how-it-works' },
        { label: 'AI Facial Recognition', href: '/#ai-showcase' },
        { label: 'One QR. Every Memory', href: '/#how-it-works' },
        { label: 'Pricing Plans', href: '/#pricing' },
        { label: 'Security & Privacy', href: '/#security' },
      ]
    },
    studioOs: {
      title: 'Studio Business OS',
      links: [
        { label: 'Events Dashboard', href: '/dashboard' },
        { label: 'Leads & CRM', href: '/dashboard/crm' },
        { label: 'GST Invoices & Finance', href: '/dashboard/finance' },
        { label: 'Booking Calendar', href: '/dashboard/calendar' },
        { label: 'Crew Mobile Portal', href: '/crew/login' },
      ]
    },
    company: {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact Studio Support', href: '/contact' },
        { label: 'Frequently Asked Questions', href: '/#faq' },
      ]
    },
    support: {
      title: 'Support & Community',
      links: [
        { label: 'Photographer Sign In', href: '/login' },
        { label: 'Start Free Trial', href: '/login?mode=signup' },
        { label: 'Privacy Policy', href: '/about#privacy' },
        { label: 'Terms of Service', href: '/about#terms' },
      ]
    }
  };

  return (
    <>
      <footer className="bg-white text-[#181818] border-t border-[#E8E4DC] relative overflow-hidden" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Get My Moment Footer</h2>

        {/* Main Footer Container */}
        <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            {/* Column 1: Brand & Trust Badges (Left) */}
            <div className="lg:col-span-4 space-y-4">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <Camera className="w-5 h-5 text-white stroke-[2.2]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-lg sm:text-xl tracking-tight text-[#181818] leading-none">
                    Get My Moment
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5">
                    AI Photo Delivery
                  </span>
                </div>
              </Link>

              <p className="text-xs sm:text-sm text-[#605D58] leading-relaxed max-w-sm">
                AI-powered wedding photo delivery and studio business management built specifically for Indian wedding photographers.
              </p>

              {/* Trust Pillars */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#181818]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Event-Scoped Biometric Privacy</span>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#181818]">
                  <HardDrive className="w-4 h-4 text-[#E86A5B] shrink-0" />
                  <span>Secure Cloud Storage</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Columns (4 Columns on md+) */}
            <div className="hidden md:grid md:grid-cols-4 lg:col-span-8 gap-8">
              {/* Product */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#181818]">
                  {footerSections.product.title}
                </h4>
                <ul className="space-y-2.5 text-xs text-[#605D58]">
                  {footerSections.product.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => setIsDemoModalOpen(true)}
                      className="text-xs text-[#E86A5B] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Try Live Demo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </li>
                </ul>
              </div>

              {/* Studio OS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#181818]">
                  {footerSections.studioOs.title}
                </h4>
                <ul className="space-y-2.5 text-xs text-[#605D58]">
                  {footerSections.studioOs.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#181818]">
                  {footerSections.company.title}
                </h4>
                <ul className="space-y-2.5 text-xs text-[#605D58]">
                  {footerSections.company.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#181818]">
                  {footerSections.support.title}
                </h4>
                <ul className="space-y-2.5 text-xs text-[#605D58]">
                  {footerSections.support.links.map((link, idx) => (
                    <li key={idx}>
                      <Link href={link.href} className="hover:text-[#E86A5B] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mobile Accordion (Mobile < md only) */}
            <div className="md:hidden space-y-2.5">
              {Object.entries(footerSections).map(([key, section]) => {
                const isOpen = !!openAccordions[key];
                return (
                  <div key={key} className="border border-[#E8E4DC] rounded-2xl overflow-hidden bg-[#FAF8F5]">
                    <button
                      onClick={() => toggleAccordion(key)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold text-[#181818] cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span>{section.title}</span>
                      <ChevronDown className={`w-4 h-4 text-[#E86A5B] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-2 border-t border-[#E8E4DC] pt-3 bg-white">
                        <ul className="space-y-2 text-xs text-[#605D58]">
                          {section.links.map((link, idx) => (
                            <li key={idx}>
                              <Link
                                href={link.href}
                                className="hover:text-[#E86A5B] transition-colors block py-0.5"
                              >
                                {link.label}
                              </Link>
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

        {/* Legal & Copyright Bar */}
        <div className="border-t border-[#E8E4DC] bg-[#FAF8F5]">
          <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#605D58]">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span>&copy; {new Date().getFullYear()} <strong className="text-[#181818]">Get My Moment</strong>. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-[#605D58] flex-wrap justify-center">
              <Link href="/about#privacy" className="hover:text-[#E86A5B] transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/about#terms" className="hover:text-[#E86A5B] transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-[#E86A5B] transition-colors">
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
