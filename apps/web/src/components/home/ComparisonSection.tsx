'use client';

import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';

export function ComparisonSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-28 bg-[#FAF8F5] border-b border-[#E8E4DC]">
      <div className="max-w-7xl 2xl:max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <span>THE DELIVERY TRANSFORMATION</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            Stop Making Guests Search <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">Through Thousands of Photos</span>
          </h2>

          <p className="text-sm sm:text-base text-[#605D58] max-w-2xl mx-auto leading-relaxed">
            Comparing traditional shared folder delivery with personalized AI photo discovery.
          </p>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {/* Traditional Delivery Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 border border-rose-200 shadow-2xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-black text-base">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black text-[#181818]">
                    Traditional Shared Galleries
                  </h3>
                  <span className="text-xs font-semibold text-rose-600">
                    Manual searching &amp; high friction
                  </span>
                </div>
              </div>

              <ul className="space-y-3.5 pt-2 text-xs sm:text-sm text-[#605D58]">
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Large shared galleries containing thousands of unsorted photos.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Guests forced to scroll endlessly to find personal moments.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Difficult personal-photo discovery across multi-day events.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Manual requests to the studio for specific event photographs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-500 font-bold mt-0.5">✕</span>
                  <span>Generic guest experience with missed studio inquiry opportunities.</span>
                </li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-rose-800 font-medium">
              Result: Slow photo discovery and high post-event manual effort.
            </div>
          </div>

          {/* Get My Moment AI Delivery Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 border-2 border-emerald-500/80 shadow-md space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black text-base">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black text-[#181818]">
                    Get My Moment AI Delivery
                  </h3>
                  <span className="text-xs font-semibold text-emerald-700">
                    Personalized, fast &amp; studio-branded
                  </span>
                </div>
              </div>

              <ul className="space-y-3.5 pt-2 text-xs sm:text-sm text-[#181818]">
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Personalized Guest Experience:</strong> Guests take a quick selfie to surface their moments.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Fast Photo Discovery:</strong> AI searches the selected event gallery in seconds.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Mobile-Friendly Access:</strong> 100% in-browser without requiring app downloads.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Studio-Branded Experience:</strong> Downloads carry your studio logo watermark.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Capture Guest Inquiries:</strong> Collects high-intent wedding inquiry leads from guests.</span>
                </li>
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Result: Effortless guest discovery &amp; new studio client inquiries.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ComparisonSection;
