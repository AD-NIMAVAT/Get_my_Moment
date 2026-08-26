'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: "How does photo discovery work for wedding guests?",
    a: "When you upload wedding photos, our system indexes portraits across ceremony albums. When a guest scans the event QR code and takes a quick selfie in their mobile browser, Get My Moment searches the selected event gallery and presents all their matching photos."
  },
  {
    q: "Do wedding guests need to install an app?",
    a: "No app download is required! Guests point their phone camera at the table QR code standee, take a selfie in their browser, and their personal gallery appears in seconds."
  },
  {
    q: "How do wedding photos get uploaded?",
    a: "You can stream photos directly from your camera via Wi-Fi/FTP in real-time, upload high-res folders from your phone, or drag-and-drop batches from your studio computer."
  },
  {
    q: "How quickly can guests find their photos?",
    a: "Once a guest takes a selfie, Get My Moment searches the selected event gallery and surfaces their matched portraits in seconds."
  },
  {
    q: "Can I use my own studio branding and watermark?",
    a: "Yes! On Studio Pro and Studio OS plans, all client gallery views and downloaded photos carry your studio logo watermark."
  },
  {
    q: "How is guest information handled?",
    a: "Face matching operates strictly within the selected wedding event scope. Guest search selfies require explicit consent and are handled securely."
  },
  {
    q: "Can my photography crew use the platform during shoots?",
    a: "Yes. With our Crew Field Mobile Portal, your photographers and cinematographers can log in via their phones to view assigned events and upload photos."
  },
  {
    q: "How does the free trial work?",
    a: "You can create your account for free with starter cloud storage to test photo delivery, QR code standees, client album selection, and studio tools."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 lg:py-28 bg-[#FAF8F5] border-b border-[#E8E4DC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>COMMON QUESTIONS &amp; ANSWERS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#181818] tracking-tight">
            Frequently Asked <br className="hidden sm:inline" />
            <span className="text-[#E86A5B]">Questions</span>
          </h2>

          <p className="text-sm text-[#605D58] leading-relaxed">
            Everything you need to know about photo delivery, QR standees, and studio management.
          </p>
        </div>

        {/* Accessible Accordion List */}
        <div className="space-y-3 max-w-[840px] mx-auto">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden transition-all shadow-2xs"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5]/60 transition-colors"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <span className="text-sm font-bold text-[#181818]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#E86A5B] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="px-5 pb-5 text-xs text-[#605D58] leading-relaxed border-t border-[#E8E4DC]/60 pt-3"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
