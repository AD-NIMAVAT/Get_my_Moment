'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
  Camera, LogOut, LayoutDashboard, Users, 
  ShieldCheck, ArrowLeft, KeyRound, Cpu, Lock, Menu, X, ArrowRight
} from 'lucide-react';
import { LiveDemoModal } from '@/components/home/LiveDemoModal';

export function Navbar() {
  const pathname = usePathname() || '';
  const { user, logout } = useAuth();
  const { admin, logout: adminLogout } = useAdminAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Dynamic Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard Accessibility (Escape key closes mobile menu) & Body Scroll Lock
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

  // Auto-close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide Navbar on Guest Galleries, Client Album Selection & Field Crew Portals
  if (
    pathname.startsWith('/e/') || 
    pathname.startsWith('/selection/') || 
    pathname.startsWith('/crew')
  ) {
    return null;
  }

  // Dedicated SUPER ADMIN NAVBAR
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return (
        <header className="sticky top-0 z-50 w-full bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E4DC] text-[#181818]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                <KeyRound className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#181818] leading-none">
                  Get My Moment
                </span>
                <span className="text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5">
                  Super Admin Gateway
                </span>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-[#605D58] hover:text-[#181818] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E8E4DC] shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          </div>
        </header>
      );
    }

    return (
      <header className="sticky top-0 z-50 w-full bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E4DC] text-[#181818]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#181818] leading-none">
                  Get My Moment
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E86A5B]/10 text-[#E86A5B] text-[10px] font-bold border border-[#E86A5B]/20">
                  SUPER ADMIN
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider text-[#605D58] uppercase mt-0.5">
                Master Platform Control
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {admin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-vault-modal'));
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white border border-[#E86A5B]/30 text-[#E86A5B] hover:bg-[#E86A5B]/5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gateway Vault</span>
                  <span className="sm:hidden">Vault</span>
                </button>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#181818]">{admin.email}</span>
                  <span className="text-[10px] font-bold text-[#E86A5B] tracking-wider">PLATFORM OWNER</span>
                </div>
                <button
                  onClick={adminLogout}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Logout Super Admin"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // MAIN BRAND NAVBAR
  return (
    <>
      <header 
        className={`sticky top-0 z-50 w-full transition-all duration-200 no-print ${
          isScrolled 
            ? 'bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E4DC] shadow-[0_4px_20px_rgba(0,0,0,0.03)] py-3' 
            : 'bg-transparent border-b border-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo (Left) */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Camera className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-[#181818] leading-none">
                Get My Moment
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5">
                Photo Delivery &amp; Studio OS
              </span>
            </div>
          </Link>

          {/* DESKTOP VIEW: Center Navigation */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-[#181818]">
            {user ? (
              /* Studio Logged-In Tabs */
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-[#E8E4DC] shadow-xs">
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard' 
                      ? 'bg-[#E86A5B] text-white shadow-xs' 
                      : 'text-[#605D58] hover:text-[#181818]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Events</span>
                </Link>
                <Link 
                  href="/dashboard/crm" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard/crm' 
                      ? 'bg-[#E86A5B] text-white shadow-xs' 
                      : 'text-[#605D58] hover:text-[#181818]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>CRM &amp; Leads</span>
                </Link>
                <Link 
                  href="/dashboard/finance" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard/finance' 
                      ? 'bg-[#E86A5B] text-white shadow-xs' 
                      : 'text-[#605D58] hover:text-[#181818]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Finance</span>
                </Link>
                <Link 
                  href="/dashboard/calendar" 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    pathname === '/dashboard/calendar' 
                      ? 'bg-[#E86A5B] text-white shadow-xs' 
                      : 'text-[#605D58] hover:text-[#181818]'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </Link>
              </div>
            ) : (
              /* Public Landing Page Links */
              <div className="flex items-center gap-1">
                <Link 
                  href="/#how-it-works" 
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#605D58] hover:text-[#181818] hover:bg-black/5 transition-all"
                >
                  How It Works
                </Link>
                <Link 
                  href="/#ai-showcase" 
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#605D58] hover:text-[#181818] hover:bg-black/5 transition-all"
                >
                  AI Delivery
                </Link>
                <Link 
                  href="/#business-os" 
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#605D58] hover:text-[#181818] hover:bg-black/5 transition-all"
                >
                  Business OS
                </Link>
                <Link 
                  href="/#pricing" 
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#605D58] hover:text-[#181818] hover:bg-black/5 transition-all"
                >
                  Pricing
                </Link>
                <Link 
                  href="/#security" 
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#605D58] hover:text-[#181818] hover:bg-black/5 transition-all"
                >
                  Security
                </Link>
              </div>
            )}
          </nav>

          {/* DESKTOP ACTIONS (Right) */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2 text-xs font-bold text-[#181818] hover:text-[#E86A5B] transition-all px-3 py-1.5 rounded-xl bg-white border border-[#E8E4DC] shadow-2xs"
                  title="Studio Profile"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#E86A5B] to-[#C94F43] text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                    {user.studio_name ? user.studio_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="max-w-[120px] truncate">{user.studio_name}</span>
                </Link>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-[#605D58] hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#181818] hover:text-[#E86A5B] transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="btn-primary py-2.5 px-4.5 text-xs font-bold shadow-xs whitespace-nowrap active:scale-95 inline-flex items-center gap-1.5"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE TOGGLE (Right - Mobile only) */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            {user ? (
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-1 text-xs font-bold text-[#181818] px-2.5 py-1.5 rounded-xl bg-white border border-[#E8E4DC]"
              >
                <div className="w-4 h-4 rounded-full bg-[#E86A5B] text-white flex items-center justify-center text-[9px] font-bold">
                  {user.studio_name ? user.studio_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span className="text-[11px] font-bold">Profile</span>
              </Link>
            ) : (
              <Link
                href="/login?mode=signup"
                className="btn-primary py-1.5 px-3 text-[11px] font-bold whitespace-nowrap shadow-xs active:scale-95"
              >
                Start Free Trial
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#181818] bg-white border border-[#E8E4DC] cursor-pointer active:scale-95"
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

        {/* MOBILE SLIDE-DOWN DRAWER */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden border-t border-[#E8E4DC] bg-[#FAF8F5] px-4 pt-4 pb-8 space-y-2 shadow-2xl animate-in slide-in-from-top-3 duration-200 max-h-[85vh] overflow-y-auto"
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
                    pathname === '/dashboard' ? 'bg-[#E86A5B] text-white shadow-xs' : 'text-[#181818] bg-white border border-[#E8E4DC]'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Events Dashboard</span>
                </Link>
                <Link
                  href="/dashboard/crm"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard/crm' ? 'bg-[#E86A5B] text-white shadow-xs' : 'text-[#181818] bg-white border border-[#E8E4DC]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>CRM &amp; Leads</span>
                </Link>
                <Link
                  href="/dashboard/finance"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard/finance' ? 'bg-[#E86A5B] text-white shadow-xs' : 'text-[#181818] bg-white border border-[#E8E4DC]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Finance &amp; Invoices</span>
                </Link>
                <Link
                  href="/dashboard/calendar"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold ${
                    pathname === '/dashboard/calendar' ? 'bg-[#E86A5B] text-white shadow-xs' : 'text-[#181818] bg-white border border-[#E8E4DC]'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Calendar OS</span>
                </Link>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
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
              /* Public Visitor Links */
              <>
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>How It Works</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#ai-showcase"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>AI Delivery</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#business-os"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>Business OS</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>Pricing Plans</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/#security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>Security &amp; Privacy</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>About</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-[#181818] bg-white border border-[#E8E4DC]"
                >
                  <span>Contact</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B]" />
                </Link>

                <div className="pt-3 flex flex-col gap-2.5">
                  <Link
                    href="/login?mode=signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary py-3 px-4 text-xs font-bold text-center block shadow-xs"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-3 px-4 rounded-xl text-xs font-bold text-center block bg-white border border-[#E8E4DC] text-[#181818]"
                  >
                    Sign In
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
