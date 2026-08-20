'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
  Camera, Sparkles, LogOut, LayoutDashboard, Users, 
  ShieldCheck, ArrowLeft, KeyRound, Cpu, Lock, Menu, X, ArrowRight, Play, Search
} from 'lucide-react';
import { LiveDemoModal } from '@/components/home/LiveDemoModal';

export function Navbar() {
  const pathname = usePathname() || '';
  const { user, logout } = useAuth();
  const { admin, logout: adminLogout } = useAdminAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // 1. Dynamic Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Keyboard Accessibility (Escape key closes mobile menu) & Body Scroll Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // 3. Auto-close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 4. Hide Navbar on Guest Galleries, Client Album Selection, Field Crew Portals & Admin Dashboard
  if (
    pathname.startsWith('/e/') || 
    pathname.startsWith('/selection/') || 
    pathname.startsWith('/crew') ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  // 6. MAIN BRAND NAVBAR
  return (
    <>
      <header 
        className={`sticky top-0 z-50 w-full max-w-full box-border transition-all duration-300 ${
          isScrolled 
            ? 'py-2 bg-[#F3F1EC]/95 backdrop-blur-xl border-b border-[#E2DDD5] shadow-[0_10px_30px_rgba(0,0,0,0.06),0_4px_16px_#D4D0C7]' 
            : 'py-2.5 sm:py-3.5 bg-[#F3F1EC]/90 backdrop-blur-md border-b border-[#E2DDD5]/70'
        }`}
      >
        <div className="max-w-7xl 2xl:max-w-[1500px] 3xl:max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-10 flex items-center justify-between gap-2 box-border">
          {/* Brand Logo (Left) */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#EE7E6F] via-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-[2px_2px_6px_#D4D0C7,-2px_-2px_6px_#FFFFFF] group-hover:scale-105 transition-all duration-300 shrink-0">
              <Camera className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-[#1F1F1F] leading-none truncate">
                Get My Moment
              </span>
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5 truncate">
                STUDIO OS &amp; AI
              </span>
            </div>
          </Link>

          {/* ========================================================================= */}
          {/* DESKTOP VIEW: Links & Actions (Hidden on Mobile < md, Shown on md+)      */}
          {/* ========================================================================= */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-[#1F1F1F]">
            {user ? (
              /* Studio Tabs */
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF]">
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard' 
                      ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]' 
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Events</span>
                </Link>
                <Link 
                  href="/dashboard/crm" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard/crm' 
                      ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]' 
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>CRM</span>
                </Link>
                <Link 
                  href="/dashboard/finance" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard/finance' 
                      ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]' 
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Finance &amp; Invoices</span>
                </Link>
                <Link 
                  href="/dashboard/calendar" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard/calendar' 
                      ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]' 
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Calendar OS</span>
                </Link>
              </div>
            ) : (
              /* Public Links */
              <>
                <Link 
                  href="/" 
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    pathname === '/' && !pathname.includes('#') 
                      ? 'text-[#E86A5B] font-extrabold' 
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  Home
                </Link>
                <Link 
                  href="/#how-it-works" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] transition-all"
                >
                  How It Works
                </Link>
                <Link 
                  href="/#business-os" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] transition-all"
                >
                  Business OS
                </Link>
                <Link 
                  href="/#pricing" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] transition-all"
                >
                  Pricing
                </Link>
                <Link 
                  href="/#faq" 
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] transition-all"
                >
                  FAQs
                </Link>
                <Link 
                  href="/about" 
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    pathname === '/about' ? 'text-[#E86A5B]' : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  About
                </Link>
                <Link 
                  href="/contact" 
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    pathname === '/contact' ? 'text-[#E86A5B]' : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  Contact
                </Link>
              </>
            )}
          </nav>

          {/* Desktop Actions (Right - md+ only) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#1F1F1F] hover:text-[#E86A5B] transition-all px-3 py-2 rounded-2xl bg-[#F3F1EC] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF] border border-white/60 group"
                  title="Studio Profile & Subscription Plan"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E86A5B] to-[#C94F43] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm shrink-0">
                    {user.studio_name ? user.studio_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="font-bold max-w-[120px] truncate">{user.studio_name}</span>
                </Link>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="text-xs p-2.5 rounded-xl text-[#6B6B6B] hover:text-rose-600 font-semibold transition-all flex items-center gap-1.5 cursor-pointer neu-icon-btn shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#E86A5B] bg-[#E86A5B]/10 hover:bg-[#E86A5B]/15 border border-[#E86A5B]/20 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Search className="w-3.5 h-3.5 text-[#E86A5B]" />
                  <span>Find My Photos</span>
                </button>
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#1F1F1F] hover:text-[#E86A5B] transition-colors px-2.5 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="btn-primary py-2 px-4 text-xs font-bold shadow-[3px_3px_8px_#D4D0C7,-3px_-3px_8px_#FFFFFF] whitespace-nowrap active:scale-95 inline-flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MOBILE VIEW: Compact Single Action + Hamburger (Hidden on md+, Shown < md) */}
          {/* ========================================================================= */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {user ? (
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-1 text-xs font-bold text-[#1F1F1F] px-2.5 py-1.5 rounded-xl bg-[#F3F1EC] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF] border border-white/60"
              >
                <div className="w-4 h-4 rounded-full bg-[#E86A5B] text-white flex items-center justify-center text-[9px] font-bold">
                  {user.studio_name ? user.studio_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span className="text-[11px] font-bold">Profile</span>
              </Link>
            ) : (
              <Link
                href="/login?mode=signup"
                className="btn-primary py-1.5 px-3 text-[11px] font-bold whitespace-nowrap shadow-sm active:scale-95"
              >
                Start Free
              </Link>
            )}

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#1F1F1F] neu-icon-btn shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF] cursor-pointer active:scale-95 shrink-0"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-[#E86A5B]" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden border-t border-[#E2DDD5] bg-[#F3F1EC] px-4 pt-4 pb-8 space-y-2.5 shadow-2xl animate-in slide-in-from-top-3 duration-200 max-h-[85vh] overflow-y-auto box-border"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            {user ? (
              /* Studio Mobile Links */
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard' ? 'bg-[#E86A5B] text-white shadow-md' : 'text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Events Dashboard</span>
                </Link>
                <Link
                  href="/dashboard/crm"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard/crm' ? 'bg-[#E86A5B] text-white shadow-md' : 'text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>CRM &amp; Leads</span>
                </Link>
                <Link
                  href="/dashboard/finance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard/finance' ? 'bg-[#E86A5B] text-white shadow-md' : 'text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Finance &amp; Invoicing</span>
                </Link>
                <Link
                  href="/dashboard/calendar"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard/calendar' ? 'bg-[#E86A5B] text-white shadow-md' : 'text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Calendar OS</span>
                </Link>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <div className="w-5 h-5 rounded-full bg-[#E86A5B] text-white flex items-center justify-center text-[10px] font-bold">
                    {user.studio_name?.charAt(0) || 'S'}
                  </div>
                  <span>Studio Profile &amp; Plan</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 mt-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              /* Visitor Public Mobile Links */
              <>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>Home</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>How It Works</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#business-os"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>Photographer Business OS</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>Pricing Plans</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>FAQs</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>About Us</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#1F1F1F] bg-[#FAF9F7] border border-[#E8E5E2]"
                >
                  <span>Contact Us</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>

                {/* Mobile Drawer CTAs */}
                <div className="pt-3 flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsDemoModalOpen(true);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-[#E86A5B]" />
                    <span>Find My Photos (Live Demo)</span>
                  </button>

                  <Link
                    href="/login?mode=signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary py-3.5 px-4 text-xs font-bold text-center block shadow-md"
                  >
                    Start Free Studio Trial
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="neu-btn-secondary py-3 px-4 text-xs font-bold text-center block"
                  >
                    Photographer Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Interactive Live Demo Modal */}
      <LiveDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </>
  );
}

export default Navbar;
