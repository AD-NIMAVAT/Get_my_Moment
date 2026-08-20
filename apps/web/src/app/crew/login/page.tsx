"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Phone, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";

export default function CrewLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Please enter your registered mobile number");
      return;
    }

    try {
      setLoading(true);
      const res = await api.crewLogin(phone.trim());
      toast.success(`Welcome back, ${res.name}! Loaded ${res.total_assigned_events} event(s).`);
      router.push("/crew/dashboard");
    } catch (err: any) {
      toast.error(err.message || "No crew assignments found for this number.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F1EC] flex flex-col items-center justify-center p-4 selection:bg-[#E86A5B] selection:text-white">
      {/* Background Subtle Accent */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E86A5B]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] text-white shadow-lg shadow-[#E86A5B]/25 mb-3">
            <Camera className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#1F1F1F] tracking-tight">
            Get My Moment
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-[#EBE8E1] text-[11px] font-bold text-[#6B6B6B]">
            <Sparkles className="w-3 h-3 text-[#E86A5B]" />
            <span>Field Crew & Photographer Portal</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="neu-card p-7 sm:p-8">
          <h2 className="text-lg font-bold text-[#1F1F1F] mb-1">
            Sign In to Field Duties
          </h2>
          <p className="text-xs text-[#6B6B6B] mb-6 leading-relaxed">
            Enter your mobile number to access your assigned shoot schedule, camera Wi-Fi pairing credentials, and live ceremony routing.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
                Registered Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B6B6B]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="gmm-input w-full pl-10 font-mono tracking-wider text-sm font-bold"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-[#E86A5B]/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Assignment...</span>
                </>
              ) : (
                <>
                  <span>Access Field Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Guarantee Badge */}
          <div className="mt-6 pt-5 border-t border-[#E8E5E2] flex items-center gap-3 text-[11px] text-[#6B6B6B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted zero-leakage session scoped strictly to your assigned events.</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-[#6B6B6B]">
          Studio Owner? <a href="/login" className="font-bold text-[#E86A5B] hover:underline">Studio Dashboard Login</a>
        </div>
      </div>
    </div>
  );
}
