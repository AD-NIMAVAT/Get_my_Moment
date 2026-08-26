'use client';

import React from 'react';
import { 
  Users, Receipt, Calendar, IndianRupee, 
  Smartphone, Heart, LayoutDashboard, ArrowRight
} from 'lucide-react';

const WORKFLOW_STAGES = [
  { label: "Lead", desc: "Inquiries" },
  { label: "Quote", desc: "Proposals" },
  { label: "Book", desc: "Calendar" },
  { label: "Shoot", desc: "Crew" },
  { label: "Deliver", desc: "AI QR" },
  { label: "Payment", desc: "GST & UPI" },
  { label: "Album", desc: "Proofing" },
];

export function BusinessOS() {
  return (
    <section id="business-os" className="py-16 sm:py-24 lg:py-28 bg-[#FAF8F5] border-b border-[#E8E4DC]">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>PHOTO DELIVERY IS JUST THE BEGINNING</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            From First Inquiry <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">to Final Album</span>
          </h2>

          <p className="text-base sm:text-lg font-bold text-[#181818]">
            Run Your Entire Photography Studio From One Place.
          </p>

          <p className="text-xs sm:text-sm text-[#605D58] max-w-2xl mx-auto leading-relaxed">
            Get My Moment goes beyond guest photo delivery and connects the everyday workflow behind a professional wedding photography studio.
          </p>
        </div>

        {/* Visual Lifecycle Bridge */}
        <div className="mb-12 max-w-4xl mx-auto bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E4DC] shadow-2xs">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 scrollbar-none">
            {WORKFLOW_STAGES.map((stage, idx) => (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center text-center shrink-0 min-w-[70px]">
                  <span className="text-xs font-black text-[#181818]">{stage.label}</span>
                  <span className="text-[10px] text-[#605D58]">{stage.desc}</span>
                </div>
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#E86A5B] shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {/* Card 1: Leads & CRM (Large 2-col on md+) */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40 transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-[#E86A5B]/10 border border-[#E86A5B]/20 text-[#E86A5B] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-black text-[#181818]">
                Leads &amp; Inquiries CRM
              </h3>
              <p className="text-xs sm:text-sm text-[#605D58] leading-relaxed max-w-xl">
                Capture wedding inquiries from Instagram, QR codes, and referrals. Track stages from new lead to advance booking.
              </p>
            </div>

            {/* Mockup Preview */}
            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-medium">
              <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DC] space-y-1">
                <span className="text-[10px] font-bold text-[#E86A5B] uppercase">New Inquiry</span>
                <div className="font-bold text-[#181818] truncate">Verma Wedding</div>
                <div className="text-[11px] text-[#605D58]">Candid Photography</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DC] space-y-1">
                <span className="text-[10px] font-bold text-[#D9A441] uppercase">Quote Sent</span>
                <div className="font-bold text-[#181818] truncate">Patel &amp; Joshi</div>
                <div className="text-[11px] text-[#605D58]">Full Wedding Suite</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DC] space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Booked</span>
                <div className="font-bold text-[#181818] truncate">Shah Grand Gala</div>
                <div className="text-[11px] text-emerald-700 font-bold">Advance Confirmed</div>
              </div>
            </div>
          </div>

          {/* Card 2: Smart Quotations */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-[#D9A441]/10 border border-[#D9A441]/20 text-[#D9A441] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-black text-[#181818]">
                Smart Quotations
              </h3>
              <p className="text-xs text-[#605D58] leading-relaxed">
                Generate professional PDF quotations with candid, cinematography, and album deliverables.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs font-mono text-[#181818] flex justify-between items-center">
              <span>PDF Proposal</span>
              <span className="text-[#E86A5B] font-bold">Generated</span>
            </div>
          </div>

          {/* Card 3: Booking Calendar */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-black text-[#181818]">
                Booking Calendar
              </h3>
              <p className="text-xs text-[#605D58] leading-relaxed">
                Prevent schedule conflicts on auspicious wedding dates and coordinate team assignments.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <span>Schedule Conflict Prevention</span>
            </div>
          </div>

          {/* Card 4: GST Invoices & Payments (Large 2-col on md+) */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40 transition-all flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-display font-black text-[#181818]">
                GST Invoices &amp; UPI Payments
              </h3>
              <p className="text-xs sm:text-sm text-[#605D58] leading-relaxed max-w-xl">
                Issue SAC 9983 photography tax invoices with GST breakdown and dynamic UPI QR codes for direct client settlements.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-[#605D58]">TAX INVOICE SAC 9983</span>
                <div className="font-bold text-[#181818]">Wedding Photography Package</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-[#181818] text-sm">₹1,85,000</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  UPI QR READY
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Crew Mobile Portal */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-black text-[#181818]">
                Crew Mobile Portal
              </h3>
              <p className="text-xs text-[#605D58] leading-relaxed">
                Photographers and crew log in via mobile to view assigned ceremonies and upload event photos.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-xs font-mono text-[#181818] flex justify-between items-center">
              <span>Field Portal</span>
              <span className="text-purple-700 font-bold">Assigned Shoots</span>
            </div>
          </div>

          {/* Card 6: Client Album Selection */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40 transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-black text-[#181818]">
                Client Album Selection Portal
              </h3>
              <p className="text-xs sm:text-sm text-[#605D58] leading-relaxed max-w-xl">
                Clients review photos from home, heart their favorites, and leave specific spread notes for the album designer.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-between text-xs font-bold">
              <span className="text-[#181818]">Client Proofing Portal</span>
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Favorites Finalized</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BusinessOS;
