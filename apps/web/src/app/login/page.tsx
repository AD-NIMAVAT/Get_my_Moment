'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Camera, Lock, Mail, Building, Phone, ArrowRight, Sparkles, 
  ShieldCheck, MapPin, Instagram, Globe, Award, CheckCircle2, ArrowLeft, Check 
} from 'lucide-react';
import { NeomorphicSelect } from '@/components/NeomorphicSelect';

const SPECIALIZATIONS_LIST = [
  'Wedding & Pre-Wedding',
  'Cinematic Films & Teasers',
  'Candid Photography',
  'Traditional Video & Photo',
  'Maternity & Baby Shoots',
  'Corporate & Commercial Events',
  'Fashion & Editorial',
  'Destination Weddings',
];

const EXPERIENCE_OPTIONS = [
  '1 - 2 Years (Emerging Studio)',
  '3 - 5 Years (Established Pro)',
  '5 - 10 Years (Senior Studio Leader)',
  '10+ Years (Master Veteran)',
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: KYC & Profile
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('3 - 5 Years (Established Pro)');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(['Wedding & Pre-Wedding', 'Candid Photography']);
  const [gstNumber, setGstNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const signupParam = searchParams.get('signup');
    if (signupParam === 'true') {
      setMode('signup');
    }
  }, [searchParams]);

  const toggleSpecialization = (item: string) => {
    if (selectedSpecializations.includes(item)) {
      setSelectedSpecializations(selectedSpecializations.filter((s) => s !== item));
    } else {
      setSelectedSpecializations([...selectedSpecializations, item]);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim()) {
      setError('Studio Name is required');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Email and Password are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setError(null);
    setSignupStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.photographerLogin(email.trim(), password);
        login(res.access_token, {
          id: res.photographer_id,
          email: res.email,
          studio_name: res.studio_name,
          is_active: true,
          is_verified: res.is_verified || false,
          verification_status: (res.verification_status as any) || 'PENDING_REVIEW',
          subscription_plan: res.subscription_plan || 'SOLO_PRO',
          created_at: new Date().toISOString(),
        });
        router.push('/dashboard');
      } else {
        const res = await api.photographerRegister({
          email: email.trim(),
          password: password,
          studio_name: studioName.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          state: stateName.trim() || undefined,
          instagram_handle: instagramHandle.trim() || undefined,
          portfolio_url: portfolioUrl.trim() || undefined,
          years_of_experience: yearsOfExperience,
          specializations: selectedSpecializations.join(', '),
          gst_number: gstNumber.trim() || undefined,
        });

        login(res.access_token, {
          id: res.photographer_id,
          email: res.email,
          studio_name: res.studio_name,
          city: city.trim(),
          state: stateName.trim(),
          instagram_handle: instagramHandle.trim(),
          portfolio_url: portfolioUrl.trim(),
          years_of_experience: yearsOfExperience,
          specializations: selectedSpecializations.join(', '),
          gst_number: gstNumber.trim(),
          is_active: true,
          is_verified: false,
          verification_status: 'PENDING_REVIEW',
          subscription_plan: res.subscription_plan || 'SOLO_PRO',
          created_at: new Date().toISOString(),
        });
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-5 sm:p-8 md:p-10 rounded-3xl neu-card relative z-10 my-3 sm:my-6 shadow-[6px_6px_16px_#D4D0C7,-6px_-6px_16px_#FFFFFF]">
      <div className="text-center mb-6 sm:mb-7">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#EE7E6F] via-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold mx-auto mb-3 sm:mb-4 shadow-[4px_4px_10px_#D4D0C7,-4px_-4px_10px_#FFFFFF]">
          <Camera className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
          {mode === 'login' ? 'Photographer Portal' : 'Register Studio'}
        </h2>
        <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1.5 font-normal">
          {mode === 'login'
            ? 'Access event galleries, real-time profit dashboard, and AI vector matching.'
            : 'Join India’s top wedding photographers with AI face-matching and client OS.'}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-2xl bg-[#EBE8E1] p-1.5 mb-6 shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF]">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
            setSignupStep(1);
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
              : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
          }}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            mode === 'signup'
              ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
              : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
          }`}
        >
          Register Studio
        </button>
      </div>

      {mode === 'signup' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            signupStep === 1 
              ? 'bg-[#E86A5B]/15 text-[#E86A5B] border border-[#E86A5B]/30' 
              : 'bg-emerald-50 text-[#3FA66B] border border-emerald-200'
          }`}>
            <span className="w-4 h-4 rounded-full bg-[#E86A5B]/20 flex items-center justify-center text-[10px]">1</span>
            <span>Account</span>
          </div>
          <div className="w-6 h-[1.5px] bg-[#D4D0C7]" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            signupStep === 2 
              ? 'bg-[#E86A5B]/15 text-[#E86A5B] border border-[#E86A5B]/30' 
              : 'bg-[#EBE8E1] text-[#8E8E8E]'
          }`}>
            <span className="w-4 h-4 rounded-full bg-[#D4D0C7] flex items-center justify-center text-[10px]">2</span>
            <span>Studio KYC</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-6 shadow-sm">
          {error}
        </div>
      )}

      {/* LOGIN FORM (Standard Credential Autofill Enabled for Google Password Manager) */}
      {mode === 'login' && (
        <form 
          name="login_form" 
          id="login_form" 
          method="POST" 
          onSubmit={handleSubmit} 
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="photographer@studio.com"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-6 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* SIGNUP STEP 1: ACCOUNT CREDENTIALS */}
      {mode === 'signup' && signupStep === 1 && (
        <form onSubmit={handleNextStep} className="space-y-4" autoComplete="on">
          <div>
            <label htmlFor="studio_signup_brand" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Studio / Brand Name *
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="studio_signup_brand"
                name="studio_signup_brand"
                type="text"
                required
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="e.g. Luminary Moments Wedding Studio"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="studio_signup_email" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Owner Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="studio_signup_email"
                name="studio_signup_email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@luminarystudio.in"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="studio_signup_password" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Password (Min 8 characters) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="studio_signup_password"
                name="studio_signup_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="studio_signup_phone" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              WhatsApp / Contact Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                id="studio_signup_phone"
                name="studio_signup_phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-6 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Studio KYC</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* SIGNUP STEP 2: STUDIO KYC & VERIFICATION FORM */}
      {mode === 'signup' && signupStep === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] text-[#E86A5B] text-xs flex items-start gap-2.5 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#E86A5B] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1F1F1F] block font-bold">Verified Studio Trust Badge</strong>
              <span className="text-[#6B6B6B]">Verified studios receive the golden checkmark on client albums and priority AI queue.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                City / Base Location *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Ahmedabad / Surat"
                  className="gmm-input w-full !pl-11 !pr-3 !py-2.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                State / Region
              </label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="e.g. Gujarat / Rajasthan"
                className="gmm-input w-full px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                Instagram Handle
              </label>
              <div className="relative">
                <Instagram className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@studio_wedding_films"
                  className="gmm-input w-full !pl-11 !pr-3 !py-2.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
                Portfolio URL / Website
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://myportfoliostudio.in"
                  className="gmm-input w-full !pl-11 !pr-3 !py-2.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
              Years in Photography Business
            </label>
            <NeomorphicSelect
              value={yearsOfExperience}
              onChange={setYearsOfExperience}
              options={EXPERIENCE_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
              Photography Specializations (Select all that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SPECIALIZATIONS_LIST.map((spec) => {
                const isSelected = selectedSpecializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialization(spec)}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBE8E1] text-[#E86A5B] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] border border-[#E86A5B]/30'
                        : 'bg-[#F3F1EC] text-[#6B6B6B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF] hover:text-[#1F1F1F]'
                    }`}
                  >
                    <span>{spec}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#E86A5B] stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1">
              GST Number (Optional)
            </label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="e.g. 24ABCDE1234F1Z5"
              className="gmm-input w-full px-3.5 py-2.5 text-xs font-mono"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSignupStep(1)}
              className="neu-btn-secondary py-3 px-4 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Complete Studio Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-3 sm:px-6 py-4 sm:py-12 relative overflow-hidden bg-[#F3F1EC] min-h-[calc(100dvh-4rem)]">
      <Suspense fallback={
        <div className="w-full max-w-lg p-8 rounded-3xl neu-card text-center">
          <div className="w-8 h-8 border-3 border-[#E86A5B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-bold text-[#6B6B6B]">Loading Studio Portal...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
