'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { 
  Camera, Sparkles, LogOut, LayoutDashboard, Users, UserCheck, 
  ShieldCheck, ArrowLeft, KeyRound, Cpu, Crown, Lock 
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname() || '';
  const { user, logout } = useAuth();
  const { admin, logout: adminLogout } = useAdminAuth();

  // 1. Hide Navbar on Guest Experience Pages, Client Selection Portals & Crew Mobile Portals
  if (pathname.startsWith('/e/') || pathname.startsWith('/selection/') || pathname.startsWith('/crew')) {
    return null;
  }

  // 2. Dedicated SUPER ADMIN NAVBAR (When in /admin/* routes)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return (
        <header className="sticky top-0 z-50 w-full bg-[#F3F1EC]/95 backdrop-blur-md border-b border-[#E2DDD5] shadow-[0_4px_16px_#D4D0C7] text-[#1F1F1F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-[4px_4px_10px_#D4D0C7,-4px_-4px_10px_#FFFFFF]">
                <KeyRound className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-lg tracking-tight text-[#1F1F1F] leading-none">
                  Get My Moment
                </span>
                <span className="text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5">
                  Super Admin Gateway
                </span>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] flex items-center gap-1.5 px-3.5 py-2 rounded-xl neu-btn-secondary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Main Site</span>
            </Link>
          </div>
        </header>
      );
    }

    // Inside Admin Dashboard
    return (
      <header className="sticky top-0 z-50 w-full bg-[#F3F1EC]/95 backdrop-blur-md border-b border-[#E2DDD5] shadow-[0_4px_16px_#D4D0C7] text-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-[4px_4px_10px_#D4D0C7,-4px_-4px_10px_#FFFFFF] group-hover:scale-105 transition-all">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight text-[#1F1F1F] leading-none">
                  Get My Moment
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E86A5B]/15 text-[#E86A5B] text-[10px] font-bold border border-[#E86A5B]/30 neu-pill">
                  SUPER ADMIN
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-[#6B6B6B] uppercase mt-0.5">
                Platform Owner & Master Control
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {admin && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-vault-modal'));
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer neu-btn-secondary border border-[#E86A5B]/35 text-[#E86A5B] hover:bg-[#E86A5B]/10 hover:border-[#E86A5B]/60 shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF] hover:scale-105 active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5 text-[#E86A5B]" />
                  <span>Gateway & Bank Vault</span>
                </button>
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#1F1F1F]">{admin.email}</span>
                  <span className="text-[10px] font-bold text-[#E86A5B] tracking-wider">PLATFORM OWNER</span>
                </div>
                <button
                  onClick={adminLogout}
                  className="px-3.5 py-2 rounded-xl text-rose-600 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer neu-icon-btn"
                  title="Logout Super Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Admin Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // 3. WARM NEOMORPHIC GET MY MOMENT NAVBAR
  return (
    <header className="sticky top-0 z-50 w-full bg-[#F3F1EC]/95 backdrop-blur-md border-b border-[#E2DDD5] shadow-[0_4px_16px_#D4D0C7] text-[#1F1F1F]">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] mx-auto px-3 sm:px-6 lg:px-10 min-h-[3.75rem] sm:min-h-[4rem] flex items-center justify-between gap-2">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 sm:gap-3 group shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#EE7E6F] via-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-[3px_3px_8px_#D4D0C7,-3px_-3px_8px_#FFFFFF] group-hover:scale-105 transition-all duration-300 shrink-0">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-[#1F1F1F] leading-none truncate">
              Get My Moment
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase mt-0.5 truncate">
              STUDIO OS & AI DELIVERY
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-[#1F1F1F]">
          {user ? (
            /* Logged in Studio Navigation Tabs */
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
                <span>Finance & Invoices</span>
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
            <>
              <Link href="/#how-it-works" className="px-3 py-2 rounded-xl text-[#6B6B6B] hover:text-[#E86A5B] transition-all">
                How It Works
              </Link>
              <Link href="/#business-os" className="px-3 py-2 rounded-xl text-[#6B6B6B] hover:text-[#E86A5B] transition-all">
                Business OS
              </Link>
              <Link href="/#pricing" className="px-3 py-2 rounded-xl text-[#6B6B6B] hover:text-[#E86A5B] transition-all">
                Pricing
              </Link>
              <Link href="/#faq" className="px-3 py-2 rounded-xl text-[#6B6B6B] hover:text-[#E86A5B] transition-all">
                FAQs
              </Link>
              <Link href="/about" className="px-3 py-2 rounded-xl text-[#6B6B6B] hover:text-[#E86A5B] transition-all font-semibold">
                About Us
              </Link>
              <Link href="/contact" className="px-3 py-2 rounded-xl text-[#6B6B6B] hover:text-[#E86A5B] transition-all font-semibold">
                Contact
              </Link>
            </>
          )}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1F1F1F] hover:text-[#E86A5B] transition-all px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-[#F3F1EC] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF] border border-white/60 group"
                title="Studio Profile & Subscription Plan"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[#E86A5B] to-[#C94F43] text-white flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold shadow-sm shrink-0">
                  {user.studio_name ? user.studio_name.charAt(0).toUpperCase() : 'S'}
                </div>
                <span className="hidden sm:inline font-bold max-w-[120px] truncate">{user.studio_name}</span>
                <span className="sm:hidden font-bold text-xs">Profile</span>
              </Link>
              <button
                onClick={logout}
                title="Sign Out"
                className="text-xs p-2 sm:px-3 sm:py-2 rounded-xl text-[#6B6B6B] hover:text-rose-600 font-semibold transition-all flex items-center gap-1.5 cursor-pointer neu-icon-btn shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : pathname === '/login' ? (
            <Link
              href="/"
              className="text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F] flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl neu-btn-secondary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back Home</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-[#1F1F1F] hover:text-[#E86A5B] transition-colors px-2.5 py-1.5"
              >
                Sign In
              </Link>
              <Link
                href="/login?mode=signup"
                className="btn-primary py-1.5 px-3 sm:py-2 sm:px-4 text-xs sm:text-sm shadow-[3px_3px_8px_#D4D0C7,-3px_-3px_8px_#FFFFFF] whitespace-nowrap"
              >
                Register Studio
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#1F1F1F] neu-icon-btn shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]"
              aria-label="Toggle Mobile Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown for Logged In User */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2DDD5] bg-[#F3F1EC] px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              pathname === '/dashboard' ? 'bg-[#E86A5B] text-white' : 'text-[#1F1F1F] bg-[#EBE8E1]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Events Dashboard</span>
          </Link>
          <Link
            href="/dashboard/crm"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              pathname === '/dashboard/crm' ? 'bg-[#E86A5B] text-white' : 'text-[#1F1F1F] bg-[#EBE8E1]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>CRM & Leads</span>
          </Link>
          <Link
            href="/dashboard/finance"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              pathname === '/dashboard/finance' ? 'bg-[#E86A5B] text-white' : 'text-[#1F1F1F] bg-[#EBE8E1]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Finance & Invoicing</span>
          </Link>
          <Link
            href="/dashboard/calendar"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              pathname === '/dashboard/calendar' ? 'bg-[#E86A5B] text-white' : 'text-[#1F1F1F] bg-[#EBE8E1]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Calendar OS</span>
          </Link>
        </div>
      )}
    </header>
  );
}

export default Navbar;
