'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Sparkles } from 'lucide-react';

export function PricingSection() {
  const [showMatrix, setShowMatrix] = useState(false);

  const PLANS = [
    {
      id: "solo",
      name: "Solo Pro",
      price: "₹599",
      period: "/month",
      subtitle: "For independent photographers.",
      popular: false,
      ctaText: "Start Free Trial",
      features: [
        "10 Active Events per month",
        "100 GB Cloud Storage",
        "AI Face Recognition Matching",
        "Camera Upload & Live Sync",
        "Table QR Code Standee Generator",
        "Guest Photo Downloads"
      ]
    },
    {
      id: "studio",
      name: "Studio Pro",
      price: "₹1,999",
      period: "/month",
      subtitle: "For growing photography teams.",
      popular: true,
      ctaText: "Start Free Trial",
      features: [
        "30 Active Events per month",
        "500 GB Cloud Storage",
        "Client Album Selection Portal",
        "Custom Studio Watermarking",
        "Leads & Inquiries CRM",
        "Automated Quotation Generator",
        "Priority AI Processing"
      ]
    },
    {
      id: "os",
      name: "Studio OS",
      price: "₹4,999",
      period: "/month",
      subtitle: "For studios running their complete business workflow.",
      popular: false,
      ctaText: "Start Free Trial",
      features: [
        "Unlimited Events & Photos",
        "2,000 GB (2 TB) Cloud Storage",
        "GST Tax Invoices (SAC 9983) & UPI QR",
        "Booking Calendar OS",
        "Multi-Crew Field Mobile Portals",
        "Dedicated Account Specialist"
      ]
    }
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 lg:py-28 bg-[#FAF8F5] border-b border-[#E8E4DC]">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <span>TRANSPARENT &amp; ACCESSIBLE PLANS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            Simple Pricing for <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">Every Photography Studio</span>
          </h2>

          <p className="text-sm sm:text-base text-[#605D58] max-w-2xl mx-auto leading-relaxed">
            Start with a free starter trial. Scale as your studio booking calendar expands.
          </p>
        </div>

        {/* 3 Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? "bg-white border-2 border-[#E86A5B] shadow-xl shadow-[#E86A5B]/10 md:-translate-y-2"
                  : "bg-white border border-[#E8E4DC] shadow-2xs hover:border-[#E86A5B]/40"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[#E86A5B] text-white font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>MOST POPULAR</span>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider ${plan.popular ? "text-[#E86A5B]" : "text-[#605D58]"}`}>
                    {plan.name}
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl sm:text-4xl font-display font-black text-[#181818]">
                      {plan.price}
                    </span>
                    <span className="text-xs text-[#605D58] font-medium">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-xs text-[#605D58] mt-2 leading-relaxed">
                    {plan.subtitle}
                  </p>
                </div>

                <div className="h-px bg-[#E8E4DC]" />

                <ul className="space-y-3 text-xs text-[#181818]">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? "text-[#E86A5B]" : "text-emerald-600"}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  href="/login?mode=signup"
                  className={`w-full py-3.5 rounded-2xl text-xs font-bold text-center block transition-all active:scale-95 shadow-xs ${
                    plan.popular
                      ? "btn-primary shadow-[#E86A5B]/20"
                      : "bg-[#FAF8F5] hover:bg-white text-[#181818] border border-[#E8E4DC]"
                  }`}
                >
                  {plan.ctaText}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Expandable Feature Matrix */}
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#605D58] hover:text-[#181818] cursor-pointer transition-colors"
          >
            <span>{showMatrix ? "Hide Feature Breakdown" : "Compare Detailed Plan Capabilities"}</span>
            <ChevronDown className={`w-4 h-4 text-[#E86A5B] transition-transform duration-200 ${showMatrix ? "rotate-180" : ""}`} />
          </button>

          {showMatrix && (
            <div className="mt-6 max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4DC] text-left text-xs space-y-4 animate-in fade-in duration-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E4DC] text-[#605D58] font-bold">
                      <th className="py-3 pr-4">Feature</th>
                      <th className="py-3 px-4">Solo Pro</th>
                      <th className="py-3 px-4">Studio Pro</th>
                      <th className="py-3 pl-4">Studio OS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4DC]/60 text-[#181818]">
                    <tr>
                      <td className="py-3 pr-4 font-semibold">Active Events / month</td>
                      <td className="py-3 px-4">10</td>
                      <td className="py-3 px-4">30</td>
                      <td className="py-3 pl-4 font-bold text-[#E86A5B]">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">Cloud Storage</td>
                      <td className="py-3 px-4">100 GB</td>
                      <td className="py-3 px-4">500 GB</td>
                      <td className="py-3 pl-4 font-bold text-[#E86A5B]">2,000 GB (2 TB)</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">AI Face Recognition Matching</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">✓</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">✓</td>
                      <td className="py-3 pl-4 text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">Client Album Selection Portal</td>
                      <td className="py-3 px-4 text-[#605D58]">—</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">✓</td>
                      <td className="py-3 pl-4 text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">Leads CRM &amp; Quotations</td>
                      <td className="py-3 px-4 text-[#605D58]">—</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">✓</td>
                      <td className="py-3 pl-4 text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4 font-semibold">GST Invoices (SAC 9983) &amp; UPI QR</td>
                      <td className="py-3 px-4 text-[#605D58]">—</td>
                      <td className="py-3 px-4 text-[#605D58]">—</td>
                      <td className="py-3 pl-4 text-emerald-600 font-bold">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
