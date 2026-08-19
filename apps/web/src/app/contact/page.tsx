'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { NeomorphicSelect } from '@/components/NeomorphicSelect';
import { 
  Phone, Mail, MapPin, Clock, MessageSquare, Send, 
  Sparkles, CheckCircle2, AlertCircle, ChevronDown, 
  HelpCircle, ShieldCheck, Camera, ArrowRight, ExternalLink
} from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'How fast is the AI face recognition for wedding guests?',
    a: 'Our sub-50ms vector engine processes a selfie and returns matching event photos from thousands of RAW/JPEG images in approximately 1.5 seconds.'
  },
  {
    q: 'Can I upload photos directly from my camera via Wi-Fi?',
    a: 'Yes! Get My Moment features a high-speed Wireless Camera FTP Sync server on port 2121 that connects directly to Sony, Canon, and Nikon camera bodies.'
  },
  {
    q: 'Can I issue GST-compliant Tax Invoices to my wedding clients?',
    a: 'Yes. The Studio Finance OS allows you to configure GSTIN, HSN codes, SAC 9983 photography rates, digital authorized signatures, and direct UPI Scan-to-Pay QR codes.'
  },
  {
    q: 'How does the free trial work?',
    a: 'You can register your studio for free with zero credit card required. You get 5 GB cloud storage and full access to test AI face matching and client galleries.'
  },
  {
    q: 'Is guest biometric facial data private and safe?',
    a: '100% yes. Facial embeddings are isolated strictly per event foreign key. Guest search selfies require explicit biometric consent and are never shared across studios or third parties.'
  },
];

export default function ContactUsPage() {
  const toast = useToast();

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studioName, setStudioName] = useState('');
  const [category, setCategory] = useState('STUDIO_DEMO');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        studio_name: studioName.trim() || undefined,
        category: category,
        subject: subject.trim(),
        message: message.trim(),
      });

      setSubmittedTicketId(res.ticket_id);
      toast.success(res.message);
      setName('');
      setEmail('');
      setPhone('');
      setStudioName('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsAppChat = () => {
    const text = encodeURIComponent("Hello Get My Moment Support! 📸 I am interested in a demo / have a question regarding the Studio Platform.");
    window.open(`https://wa.me/919876543210?text=${text}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F3F1EC] text-[#1F1F1F]">
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden pt-14 pb-16 sm:pt-20 sm:pb-24 border-b border-[#E2DDD5]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-[#E86A5B]/10 text-[#E86A5B] border border-[#E86A5B]/20 mb-5 shadow-sm neu-pill">
            <MessageSquare className="w-3.5 h-3.5 text-[#E86A5B]" />
            <span>WE ARE HERE TO HELP</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-[#1F1F1F] leading-tight">
            Get in Touch with Our <br />
            <span className="text-[#E86A5B]">Studio Success Team</span>
          </h1>

          <p className="mt-4 text-xs sm:text-sm text-[#6B6B6B] max-w-xl mx-auto leading-relaxed">
            Have questions about custom plans, high-speed AI vector indexing, wireless camera sync, or enterprise photography deployments? We'd love to connect!
          </p>
        </div>
      </section>

      {/* 2. MAIN CONTACT SECTION (DETAILS + FORM) */}
      <section className="py-14 sm:py-18 bg-[#FAF9F7] border-b border-[#E2DDD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Direct Channels (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">DIRECT REACH</span>
                <h2 className="text-2xl font-display font-extrabold text-[#1F1F1F] mt-1">
                  Connect Directly
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed">
                  Our dedicated engineering and studio relations desk is based in Gujarat, India.
                </p>
              </div>

              {/* 1-Click WhatsApp Card */}
              <div 
                onClick={openWhatsAppChat}
                className="neu-card p-5 cursor-pointer hover:border-[#3FA66B]/50 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#3FA66B] flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
                    💬
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#1F1F1F]">Instant WhatsApp Support</h3>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">+91 98765 43210 (Direct Chat)</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#F3F1EC] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF] flex items-center justify-center text-[#3FA66B]">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Contact Info Cards */}
              <div className="neu-card p-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E86A5B]/15 text-[#E86A5B] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B] tracking-wider block">Official Email</span>
                    <a href="mailto:support@getmymoment.in" className="text-xs font-bold text-[#1F1F1F] hover:text-[#E86A5B] transition-colors">
                      support@getmymoment.in
                    </a>
                    <span className="text-[11px] text-[#6B6B6B] block mt-0.5">sales@getmymoment.in</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-3 border-t border-[#E2DDD5]">
                  <div className="w-9 h-9 rounded-xl bg-[#D9A441]/15 text-[#8F6420] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B] tracking-wider block">Helpline / Sales</span>
                    <span className="text-xs font-bold text-[#1F1F1F] font-mono">+91 98765 43210</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-3 border-t border-[#E2DDD5]">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B] tracking-wider block">Headquarters & Labs</span>
                    <span className="text-xs font-medium text-[#1F1F1F] leading-tight block mt-0.5">
                      Get My Moment Technologies, Ring Road / SG Highway, Surat & Ahmedabad, Gujarat, India.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 pt-3 border-t border-[#E2DDD5]">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#6B6B6B] tracking-wider block">Studio Support Hours</span>
                    <span className="text-xs font-semibold text-[#1F1F1F] block mt-0.5">
                      Monday – Saturday: 9:00 AM – 8:00 PM IST
                    </span>
                    <span className="text-[10px] text-[#6B6B6B] block">Emergency Shoot Support: 24/7 on WhatsApp</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Neomorphic Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="neu-card p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-4 mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#1F1F1F]">
                      Send Us an Inquiry
                    </h3>
                    <p className="text-xs text-[#6B6B6B]">
                      Fill out the details below and our team will get back to you promptly.
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-[#E86A5B]" />
                </div>

                {submittedTicketId && (
                  <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3 animate-tab-fade">
                    <CheckCircle2 className="w-5 h-5 text-[#3FA66B] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold">Inquiry Sent Successfully!</h4>
                      <p className="text-[11px] mt-0.5 text-emerald-700">
                        Reference Number: <strong className="font-mono">{submittedTicketId}</strong>. We have logged your request.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="gmm-input w-full text-xs"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rahul@weddingstudio.in"
                        className="gmm-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Phone / WhatsApp</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="gmm-input w-full text-xs"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Studio / Brand Name</label>
                      <input
                        type="text"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        placeholder="e.g. Luminary Moments"
                        className="gmm-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Inquiry Type</label>
                      <NeomorphicSelect
                        value={category}
                        onChange={setCategory}
                        options={[
                          { value: 'STUDIO_DEMO', label: 'Studio Platform Demo' },
                          { value: 'PRICING', label: 'Pricing & Enterprise Plan' },
                          { value: 'TECH_SUPPORT', label: 'Technical / Camera Question' },
                          { value: 'PARTNERSHIP', label: 'Partnership / Collaboration' },
                          { value: 'GENERAL', label: 'General Question' },
                        ]}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Subject *</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Inquiring about Wireless Sync setup"
                        className="gmm-input w-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Message / Inquiry Details *</label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your requirements, event scale, or any specific questions..."
                      className="gmm-input w-full text-xs resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary py-3 px-8 text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#E86A5B]/25"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Sending Message...' : 'Submit Inquiry'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
      <section className="py-16 sm:py-20 bg-[#F3F1EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#E86A5B]">KNOWLEDGE BASE</span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] mt-1">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Common questions photographers ask before getting started.
            </p>
          </div>

          <div className="space-y-3.5">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div 
                  key={index}
                  className="neu-card p-5 transition-all cursor-pointer"
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xs sm:text-sm font-bold text-[#1F1F1F] flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#E86A5B] flex-shrink-0" />
                      <span>{faq.q}</span>
                    </h3>
                    <div className={`w-6 h-6 rounded-lg bg-[#EBE8E1] flex items-center justify-center text-[#E86A5B] transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-[#E2DDD5] text-xs text-[#6B6B6B] leading-relaxed animate-tab-fade">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
