'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api, PublicEventItem, PhotoItem, MatchSearchResult } from '@/lib/api';
import { 
  Camera, Sparkles, ShieldCheck, Download, Check, AlertCircle, 
  RefreshCw, X, ArrowRight, User, Phone, Lock, Eye, Image as ImageIcon, 
  UploadCloud, Share2, MessageSquare, Heart 
} from 'lucide-react';

type Step = 'REGISTER' | 'OTP' | 'CONSENT' | 'SELFIE' | 'MATCHING' | 'GALLERY';

export default function GuestExperiencePage() {
  const params = useParams();
  const token = params.token as string;

  const [event, setEvent] = useState<PublicEventItem | null>(null);
  const [step, setStep] = useState<Step>('REGISTER');
  const [activeGuestTab, setActiveGuestTab] = useState<'AI_SEARCH' | 'GUEST_UPLOAD'>('AI_SEARCH');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [guestId, setGuestId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');

  // Consent State
  const [faceConsent, setFaceConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Camera & Selfie State
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Guest Upload State
  const [guestUploadProgress, setGuestUploadProgress] = useState<string | null>(null);
  const [guestUploading, setGuestUploading] = useState(false);
  const [guestUploadName, setGuestUploadName] = useState('');
  const [guestUploadPhone, setGuestUploadPhone] = useState('');

  // Matching & Results State
  const [matchResult, setMatchResult] = useState<MatchSearchResult | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guestFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      loadEvent();
    }
  }, [token]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicEvent(token);
      setEvent(data);
      if (!data.allow_guest_uploads) {
        setActiveGuestTab('AI_SEARCH');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to access event.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.registerGuest(event.id, { name: name.trim(), mobile: mobile.trim() });
      setGuestId(res.guest_id);
      if (res.requires_otp) {
        setStep('OTP');
      } else {
        setStep('CONSENT');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your mobile number.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId || !otpCode) return;
    setError(null);
    setLoading(true);

    try {
      await api.verifyGuestOTP(guestId, otpCode);
      setStep('CONSENT');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Consent
  const handleConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId || !faceConsent) return;
    setError(null);
    setLoading(true);

    try {
      await api.recordConsent(guestId, faceConsent, marketingConsent);
      setStep('SELFIE');
      startCamera();
    } catch (err: any) {
      setError(err.message || 'Consent recording failed');
    } finally {
      setLoading(false);
    }
  };

  // Camera Management
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera stream inaccessible or not supported, falling back to file input:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          setSelfieBlob(blob);
          setSelfiePreviewUrl(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleSelfieFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieBlob(file);
      setSelfiePreviewUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  // Step 4: Run AI Face Matching
  const runMatching = async () => {
    if (!event || !selfieBlob || !guestId) return;
    setStep('MATCHING');
    setError(null);

    try {
      const results = await api.searchSelfie(event.id, guestId, selfieBlob);
      setMatchResult(results);
      setStep('GALLERY');
    } catch (err: any) {
      setError(err.message || 'Face matching search failed. Please try with another selfie.');
      setStep('SELFIE');
      startCamera();
    }
  };

  // Guest Community Uploads
  const handleGuestPhotosUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploaderName = (guestUploadName || name).trim();
    if (!uploaderName) {
      setGuestUploadProgress('Please enter your name before uploading photos.');
      return;
    }

    setGuestUploading(true);
    setGuestUploadProgress(`Uploading ${files.length} photo(s) as ${uploaderName}...`);

    try {
      const res = await api.guestUploadPhotos(
        token, 
        Array.from(files),
        uploaderName,
        (guestUploadPhone || mobile).trim() || undefined
      );
      setGuestUploadProgress(`🎉 Success! ${res.uploaded_count} photo(s) uploaded by ${res.guest_name} added to the album.`);
      setTimeout(() => setGuestUploadProgress(null), 5000);
    } catch (err: any) {
      setGuestUploadProgress(`Upload error: ${err.message || 'Failed to upload'}`);
    } finally {
      setGuestUploading(false);
      if (guestFileInputRef.current) guestFileInputRef.current.value = '';
    }
  };

  const shareMatchOnWhatsApp = () => {
    const pageUrl = window.location.href;
    const msg = `Hey! I just found all my photos from ${event?.name} using AI face match! 📸 Check yours here: ${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading && !event) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 bg-[#F3F1EC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E86A5B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-[#6B6B6B] tracking-wider uppercase">Loading Event Gallery...</span>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[#F3F1EC]">
        <div className="max-w-md w-full p-8 rounded-3xl neu-card text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-2">Event Inactive or Not Found</h2>
          <p className="text-xs text-[#6B6B6B]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-lg w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center bg-[#F3F1EC]">
      {/* Event Header Card */}
      {event && (
        <div className="p-6 sm:p-7 rounded-3xl neu-card text-center mb-6 relative overflow-hidden">
          {event.studio_logo_url ? (
            <div className="mb-3.5 flex items-center justify-center">
              <img
                src={`${api.getApiBaseUrl().replace('/api/v1', '')}${event.studio_logo_url}`}
                alt={event.studio_name}
                className="max-h-16 max-w-[200px] object-contain drop-shadow-sm"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white mx-auto mb-3 shadow-[4px_4px_10px_#D4D0C7,-4px_-4px_10px_#FFFFFF]">
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </div>
          )}
          <span className="text-[10px] font-bold tracking-widest text-[#E86A5B] uppercase block">
            {event.studio_name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] mt-1 tracking-tight">{event.name}</h1>
          <div className="flex items-center justify-center gap-2.5 text-xs text-[#6B6B6B] mt-2.5 font-semibold flex-wrap">
            <span className="neu-pill text-[#1F1F1F] text-[11px] font-bold">
              📸 {event.photo_count} Photos
            </span>
            {event.event_date && (
              <span className="neu-pill text-[#1F1F1F] text-[11px] font-bold">
                🗓️ {new Date(event.event_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Guest Mode Selector (Only rendered if studio owner has enabled guest uploads) */}
      {event?.allow_guest_uploads && (
        <div className="flex rounded-2xl bg-[#EBE8E1] p-1.5 mb-6 shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF]">
          <button
            type="button"
            onClick={() => setActiveGuestTab('AI_SEARCH')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeGuestTab === 'AI_SEARCH'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Find My Photos (AI)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGuestTab('GUEST_UPLOAD')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeGuestTab === 'GUEST_UPLOAD'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Guest Uploads</span>
          </button>
        </div>
      )}

      {/* GUEST UPLOADS TAB (Only accessible if enabled by studio) */}
      {event?.allow_guest_uploads && activeGuestTab === 'GUEST_UPLOAD' && (
        <div className="p-6 sm:p-8 rounded-3xl neu-card text-center">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-1">Share Your Clicks with the Couple</h2>
            <p className="text-xs text-[#6B6B6B] mb-5 leading-relaxed">
              Did you take candid shots or selfies during the wedding? Upload them directly to the community guest album!
            </p>

            <div className="space-y-3.5 mb-5 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Your Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type="text"
                    required
                    value={guestUploadName || name}
                    onChange={(e) => setGuestUploadName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="gmm-input w-full !pl-11 !pr-4 !py-2.5 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Your Mobile (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <input
                    type="tel"
                    value={guestUploadPhone || mobile}
                    onChange={(e) => setGuestUploadPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="gmm-input w-full !pl-11 !pr-4 !py-2.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <input
              ref={guestFileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleGuestPhotosUpload(e.target.files)}
              className="hidden"
            />

            <button
              onClick={() => guestFileInputRef.current?.click()}
              disabled={guestUploading}
              className="btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4 stroke-[2.5]" />
              <span>Select Photos from Gallery</span>
            </button>

            {guestUploadProgress && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] text-[#1F1F1F] text-xs font-bold leading-relaxed">
                {guestUploadProgress}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI SEARCH FLOW */}
      {(!event?.allow_guest_uploads || activeGuestTab === 'AI_SEARCH') && (
        <>
          {/* Global Form Error */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold shadow-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Registration */}
          {step === 'REGISTER' && (
            <div className="p-6 sm:p-8 rounded-3xl neu-card relative overflow-hidden">
              <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-1">Find Your Personal Moments</h2>
              <p className="text-xs text-[#6B6B6B] mb-6 leading-relaxed">
                Enter your name and mobile. Our AI facial engine will instantly search and deliver only your photos.
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-4 py-3.5 text-xs flex items-center justify-center gap-2"
                >
                  <span>Continue to Privacy Consent</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 'OTP' && (
            <div className="p-6 sm:p-8 rounded-3xl neu-card text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white mx-auto mb-4 shadow-[4px_4px_10px_#D4D0C7,-4px_-4px_10px_#FFFFFF]">
                <Lock className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-1">Verify Mobile Number</h2>
              <p className="text-xs text-[#6B6B6B] mb-6">
                We sent a verification code to <span className="text-[#1F1F1F] font-mono font-bold">{mobile}</span>
              </p>

              <div className="p-3 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] text-[#8F6420] text-xs font-mono mb-6 font-bold">
                Development Mode: Use code <strong className="text-[#1F1F1F] font-bold">123456</strong>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="gmm-input w-full text-center tracking-[0.4em] text-3xl font-mono px-4 py-3.5"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-2"
                >
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Privacy & Consent */}
          {step === 'CONSENT' && (
            <div className="p-6 sm:p-8 rounded-3xl neu-card">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3FA66B]" />
                <span>TRANSPARENT BIOMETRIC PRIVACY</span>
              </div>
              <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-2">Privacy & Biometric Consent</h2>
              <p className="text-xs text-[#6B6B6B] mb-6 leading-relaxed">
                Please review our event privacy protections before taking your selfie.
              </p>

              <form onSubmit={handleConsentSubmit} className="space-y-4">
                <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={faceConsent}
                    onChange={(e) => setFaceConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#E86A5B] accent-[#E86A5B]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#1F1F1F] block">Event Facial Search Consent (Required)</span>
                    <span className="text-[#6B6B6B] block mt-1 leading-relaxed">
                      I consent to the temporary AI matching of my selfie strictly within this event's photos. My selfie is discarded after matching.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#E86A5B] accent-[#E86A5B]"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#1F1F1F] block">Studio Highlights (Optional)</span>
                    <span className="text-[#6B6B6B] block mt-1 leading-relaxed">
                      Allow {event?.studio_name} to contact me with high-res highlights and photography offers.
                    </span>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={!faceConsent || loading}
                  className="btn-primary w-full mt-4 py-3.5 text-xs flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>Accept & Take Selfie</span>
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: Camera / Selfie */}
          {step === 'SELFIE' && (
            <div className="p-6 sm:p-8 rounded-3xl neu-card text-center">
              <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-1">Take a Quick Selfie</h2>
              <p className="text-xs text-[#6B6B6B] mb-6 leading-relaxed">
                Face the camera directly in good lighting. We match your face in milliseconds.
              </p>

              <canvas ref={canvasRef} className="hidden" />

              {selfiePreviewUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden border-2 border-[#E86A5B] shadow-[8px_8px_20px_#D4D0C7,-8px_-8px_20px_#FFFFFF]">
                    <img src={selfiePreviewUrl} alt="Selfie preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSelfiePreviewUrl(null);
                        setSelfieBlob(null);
                        startCamera();
                      }}
                      className="neu-btn-secondary flex-1 py-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retake Photo</span>
                    </button>
                    <button
                      onClick={runMatching}
                      className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Find My Photos</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-square max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-black shadow-[inset_4px_4px_8px_#000000]">
                    <video
                      ref={videoRef}
                      playsInline
                      autoPlay
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded-full m-8 pointer-events-none"></div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      onClick={capturePhoto}
                      className="btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                      <span>Capture Selfie</span>
                    </button>

                    <div className="text-[11px] text-[#8C8C8C] font-bold uppercase tracking-wider">OR</div>

                    <label className="neu-btn-secondary w-full py-3 text-xs cursor-pointer block text-center transition-all font-bold">
                      <span className="flex items-center justify-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-[#E86A5B]" />
                        <span>Upload Photo from Phone Gallery</span>
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelfieFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Matching Spinner */}
          {step === 'MATCHING' && (
            <div className="p-12 sm:p-16 rounded-3xl neu-card text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-4 border-[#E86A5B]/20 border-t-[#E86A5B] animate-spin mb-6"></div>
              <h2 className="text-2xl font-display font-extrabold text-[#1F1F1F] mb-2">Analyzing Facial Geometry</h2>
              <p className="text-xs text-[#6B6B6B] max-w-xs leading-relaxed">
                Searching {event?.photo_count} event photos using local 128-dimensional cosine vector embeddings...
              </p>
            </div>
          )}

          {/* STEP 6: Private Matching Gallery */}
          {step === 'GALLERY' && matchResult && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-3xl neu-card text-center">
                <span className="text-base font-display font-extrabold text-[#1F1F1F] block">
                  🎉 {matchResult.matched_count} Moments Found for {name}
                </span>
                <span className="text-xs text-[#6B6B6B] mt-1 block">
                  Search completed in {matchResult.search_latency_ms} ms
                </span>

                <button
                  onClick={shareMatchOnWhatsApp}
                  className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share My Moments on WhatsApp</span>
                </button>
              </div>

              {matchResult.matched_photos.length === 0 ? (
                <div className="p-8 sm:p-10 text-center rounded-3xl neu-card">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-display font-extrabold text-[#1F1F1F] mb-1">No Matching Moments Found</h3>
                  <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto leading-relaxed">
                    No matching photos found for this selfie. Try again with direct front lighting!
                  </p>
                  <button
                    onClick={() => {
                      setStep('SELFIE');
                      setSelfiePreviewUrl(null);
                      startCamera();
                    }}
                    className="btn-primary mt-6 px-6 py-2.5 text-xs cursor-pointer"
                  >
                    Try Another Selfie
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5">
                  {matchResult.matched_photos.map((p) => {
                    const score = matchResult.similarity_scores[p.id] || 0.95;
                    const pct = Math.round(score * 100);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPhoto(p)}
                        className="neu-card group relative aspect-square rounded-2xl overflow-hidden cursor-pointer"
                      >
                        <img
                          src={api.getThumbnailUrl(p.id)}
                          alt="Matched moment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-[#E86A5B] border border-white shadow-sm">
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setStep('SELFIE');
                    setSelfiePreviewUrl(null);
                    startCamera();
                  }}
                  className="text-xs text-[#6B6B6B] hover:text-[#E86A5B] transition-colors font-bold"
                >
                  ← Search with a different selfie
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 text-[#1F1F1F] text-xs font-bold bg-white px-3.5 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-neutral-100 transition-colors cursor-pointer shadow-md"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
            <img
              src={api.getThumbnailUrl(selectedPhoto.id)}
              alt="High-res preview"
              className="max-h-[75vh] w-auto rounded-3xl object-contain shadow-2xl border border-white/20"
            />
            {event?.allow_downloads && (
              <a
                href={api.getDownloadUrl(selectedPhoto.id)}
                download={selectedPhoto.original_file_name}
                className="btn-primary mt-5 px-6 py-3 text-xs flex items-center gap-2 cursor-pointer shadow-xl"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download Original High-Res</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
