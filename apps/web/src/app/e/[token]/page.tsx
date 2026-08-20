'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  api, PublicEventItem, PhotoItem, MatchSearchResult, FolderItem,
  saveGuestSession, getGuestSession, clearGuestSession, GuestSessionData 
} from '@/lib/api';
import { 
  Camera, Sparkles, ShieldCheck, Download, Check, AlertCircle, 
  RefreshCw, X, ArrowRight, User, Phone, Lock, Eye, Image as ImageIcon, 
  UploadCloud, Share2, MessageSquare, Heart, LogOut, CheckCircle2,
  ChevronRight, ArrowLeft, Layers, Folder as FolderIcon
} from 'lucide-react';

type Step = 'REGISTER' | 'OTP' | 'CONSENT' | 'SELFIE' | 'MATCHING' | 'GALLERY';
type AuthMode = 'SIGNUP' | 'LOGIN';

export default function GuestExperiencePage() {
  const params = useParams();
  const token = params.token as string;

  const [event, setEvent] = useState<PublicEventItem | null>(null);
  const [step, setStep] = useState<Step>('REGISTER');
  const [authMode, setAuthMode] = useState<AuthMode>('SIGNUP');
  const [activeGuestTab, setActiveGuestTab] = useState<'AI_SEARCH' | 'GUEST_UPLOAD' | 'FOLDERS'>('AI_SEARCH');
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

  // Folders State
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Matching & Results State
  const [matchResult, setMatchResult] = useState<MatchSearchResult | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guestFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load & Refresh-Proof Session Restoration
  useEffect(() => {
    if (token) {
      initEventAndSession();
    }
  }, [token]);

  // 2. Multi-Tab Session Synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `gmm_guest_session_${token}` && !e.newValue) {
        // Session cleared in another tab
        handleSignOut(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token]);

  const initEventAndSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const eventData = await api.getPublicEvent(token);
      setEvent(eventData);

      // Load folders
      try {
        const foldersData = await api.getFolders(eventData.id);
        setFolders(foldersData);
      } catch {
        // Non-critical
      }

      // Check stored session
      const storedSession = getGuestSession(token);
      if (storedSession && storedSession.guestId) {
        // Validate with server source-of-truth
        const validated = await api.validateGuestSession(eventData.id, storedSession.guestId);
        if (validated && validated.is_valid) {
          setGuestId(validated.guestId);
          setName(validated.name);
          setMobile(storedSession.mobileMasked || '');

          // Check cached matches
          if (validated.has_matched_photos) {
            const cachedMatches = await api.getCachedGuestMatch(eventData.id, validated.guestId);
            if (cachedMatches && cachedMatches.matched_photos && cachedMatches.matched_photos.length > 0) {
              setMatchResult(cachedMatches);
              setStep('GALLERY');
              setLoading(false);
              return;
            }
          }

          // If valid session but no selfie matched yet
          if (validated.has_consent) {
            setStep('SELFIE');
            startCamera();
          } else {
            setStep('CONSENT');
          }
          setLoading(false);
          return;
        } else {
          // Session stale or invalid on server
          clearGuestSession(token);
        }
      }

      // Default state for first-time visitor
      setStep('REGISTER');
      setAuthMode('SIGNUP');
    } catch (err: any) {
      setError(err.message || 'Unable to access event.');
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.registerGuest(event.id, { name: name.trim(), mobile: mobile.trim() });
      setGuestId(res.guest_id);

      // Persist interim session
      saveGuestSession(token, {
        sessionToken: '',
        guestId: res.guest_id,
        eventId: event.id,
        name: name.trim(),
        mobileMasked: mobile.trim(),
        otpVerified: !res.requires_otp,
        hasConsent: false,
        hasMatchedPhotos: false,
        matchCount: 0,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

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

  // Login Handler (Returning Guest)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.guestLogin(event.id, mobile.trim());
      setGuestId(res.guestId);
      setName(res.name);

      // Save valid server session
      saveGuestSession(token, {
        sessionToken: res.sessionToken,
        guestId: res.guestId,
        eventId: event.id,
        name: res.name,
        mobileMasked: res.mobileMasked,
        otpVerified: res.otpVerified,
        hasConsent: res.hasConsent,
        hasMatchedPhotos: res.hasMatchedPhotos,
        matchCount: res.matchCount,
        expiresAt: res.expiresAt,
      });

      if (res.requires_otp) {
        setStep('OTP');
        return;
      }

      // Check if user already has matched moments
      if (res.hasMatchedPhotos) {
        const cached = await api.getCachedGuestMatch(event.id, res.guestId);
        if (cached && cached.matched_photos && cached.matched_photos.length > 0) {
          setMatchResult(cached);
          setStep('GALLERY');
          return;
        }
      }

      if (!res.hasConsent) {
        setStep('CONSENT');
      } else {
        setStep('SELFIE');
        startCamera();
      }
    } catch (err: any) {
      setError(err.message || 'No guest found with this mobile number. Please Sign Up.');
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId || !otpCode) return;
    setError(null);
    setLoading(true);

    try {
      await api.verifyGuestOTP(guestId, otpCode);
      setStep('CONSENT');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Consent Submission
  const handleConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestId || !faceConsent) return;
    setError(null);
    setLoading(true);

    try {
      await api.recordConsent(guestId, faceConsent, marketingConsent);
      
      // Update session consent
      const curr = getGuestSession(token);
      if (curr) {
        curr.hasConsent = true;
        saveGuestSession(token, curr);
      }

      setStep('SELFIE');
      startCamera();
    } catch (err: any) {
      setError(err.message || 'Consent recording failed.');
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
      console.warn('Camera stream inaccessible, falling back to file picker:', err);
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

  // AI Face Matching
  const runMatching = async () => {
    if (!event || !selfieBlob || !guestId) return;
    setStep('MATCHING');
    setError(null);

    try {
      const results = await api.searchSelfie(event.id, guestId, selfieBlob);
      setMatchResult(results);

      // Update session with match status
      const curr = getGuestSession(token);
      if (curr) {
        curr.hasMatchedPhotos = true;
        curr.matchCount = results.matched_count;
        saveGuestSession(token, curr);
      }

      setStep('GALLERY');
    } catch (err: any) {
      setError(err.message || 'Face matching search failed. Please try with another selfie.');
      setStep('SELFIE');
      startCamera();
    }
  };

  // Retake Selfie Handler
  const handleRetakeSelfie = () => {
    setSelfieBlob(null);
    setSelfiePreviewUrl(null);
    setStep('SELFIE');
    startCamera();
  };

  // Sign Out / Switch Guest Handler
  const handleSignOut = (confirmUser: boolean = true) => {
    if (confirmUser && typeof window !== 'undefined') {
      const ok = window.confirm('Are you sure you want to switch guest or sign out on this device?');
      if (!ok) return;
    }

    clearGuestSession(token);
    stopCamera();
    setGuestId(null);
    setName('');
    setMobile('');
    setOtpCode('');
    setSelfieBlob(null);
    setSelfiePreviewUrl(null);
    setMatchResult(null);
    setSelectedPhoto(null);
    setStep('REGISTER');
    setAuthMode('LOGIN');
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
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center bg-[#F3F1EC] selection:bg-[#E86A5B] selection:text-white">
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

      {/* STEP 1: AUTHENTICATION / REGISTER / LOGIN SWITCHER */}
      {step === 'REGISTER' && (
        <div className="p-6 sm:p-8 rounded-3xl neu-card">
          {/* Sign Up / Login Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-[#EBE8E1] mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGNUP');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'SIGNUP'
                  ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                  : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              New Guest (Sign Up)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('LOGIN');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'LOGIN'
                  ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                  : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              Already Registered (Login)
            </button>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-display font-extrabold text-[#1F1F1F]">
              {authMode === 'SIGNUP' ? 'Find Your Photos with AI' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-1">
              {authMode === 'SIGNUP'
                ? 'Sign up once with your name & mobile to discover your moments in real time.'
                : 'Enter your registered mobile number to instantly resume your gallery.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN UP FORM */}
          {authMode === 'SIGNUP' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="guest_signup_name" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="guest_signup_name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="guest_signup_mobile" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
                  Mobile Number (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="guest_signup_mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="gmm-input w-full !pl-11 !pr-4 !py-3 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="signup_consent_check"
                  checked={faceConsent}
                  onChange={(e) => setFaceConsent(e.target.checked)}
                  className="mt-0.5 accent-[#E86A5B] cursor-pointer"
                />
                <label htmlFor="signup_consent_check" className="text-[11px] text-[#6B6B6B] leading-tight cursor-pointer">
                  I consent to private AI face matching solely within this wedding event. My selfie is never shared publicly.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !faceConsent}
                className="btn-primary w-full mt-4 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#E86A5B]/25"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Proceed to Selfie Capture</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="guest_login_mobile" className="block text-xs font-bold text-[#1F1F1F] mb-1.5">
                  Registered Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#E86A5B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="guest_login_mobile"
                    name="mobile"
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
                disabled={loading || !mobile.trim()}
                className="btn-primary w-full mt-4 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#E86A5B]/25"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Log In &amp; Restore Photos</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Biometric Privacy Guarantee */}
          <div className="mt-6 pt-5 border-t border-[#E2DDD5] flex items-center justify-center gap-2 text-[11px] text-[#6B6B6B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Event-Scoped Biometric Privacy Protected</span>
          </div>
        </div>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {step === 'OTP' && (
        <div className="p-6 sm:p-8 rounded-3xl neu-card text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#E86A5B]/10 text-[#E86A5B] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-1">Verify Mobile Number</h2>
          <p className="text-xs text-[#6B6B6B] mb-6">
            Enter the 6-digit verification code sent to <strong className="text-[#1F1F1F]">{mobile}</strong>
          </p>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              className="gmm-input w-full text-center text-xl font-mono tracking-widest !py-3 font-bold"
            />

            <button
              type="submit"
              disabled={loading || otpCode.length < 4}
              className="btn-primary w-full py-3.5 text-xs font-bold"
            >
              {loading ? 'Verifying...' : 'Confirm Verification Code'}
            </button>
          </form>

          <button
            onClick={() => setStep('REGISTER')}
            className="mt-4 text-xs font-bold text-[#6B6B6B] hover:text-[#E86A5B]"
          >
            ← Change Mobile Number
          </button>
        </div>
      )}

      {/* STEP 3: BIOMETRIC PRIVACY CONSENT */}
      {step === 'CONSENT' && (
        <div className="p-6 sm:p-8 rounded-3xl neu-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-extrabold text-[#1F1F1F]">Biometric Privacy Consent</h2>
              <span className="text-[10px] text-[#6B6B6B] uppercase font-bold tracking-wider">Step 2 of 3 • Mandatory for AI search</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] text-xs text-[#6B6B6B] space-y-2 mb-6 leading-relaxed">
            <p>
              To find and organize your moments, <strong>Get My Moment</strong> extracts temporary 128-dimensional facial vector math from your selfie.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Your vectors are strictly scoped to this wedding event ({event?.name}).</li>
              <li>Your raw selfie is never sold or used for public training.</li>
              <li>You can delete or update your selfie at any time.</li>
            </ul>
          </div>

          <form onSubmit={handleConsentSubmit} className="space-y-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={faceConsent}
                onChange={(e) => setFaceConsent(e.target.checked)}
                className="mt-0.5 accent-[#E86A5B]"
              />
              <span className="text-xs font-bold text-[#1F1F1F]">
                I give consent to AI facial indexing solely for this event. *
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 accent-[#E86A5B]"
              />
              <span className="text-xs text-[#6B6B6B]">
                (Optional) Allow {event?.studio_name} to send me event highlights on WhatsApp.
              </span>
            </label>

            <button
              type="submit"
              disabled={!faceConsent || loading}
              className="btn-primary w-full mt-4 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Accept &amp; Take Selfie</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: SELFIE CAPTURE / UPLOAD */}
      {step === 'SELFIE' && (
        <div className="p-6 sm:p-8 rounded-3xl neu-card text-center">
          <h2 className="text-lg font-display font-extrabold text-[#1F1F1F] mb-1">Take Your Selfie</h2>
          <p className="text-xs text-[#6B6B6B] mb-5">
            Position your face inside the frame in good lighting.
          </p>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-4">
              {error}
            </div>
          )}

          {/* Camera Viewfinder / Preview */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto rounded-3xl overflow-hidden bg-black shadow-inner border-2 border-[#E86A5B]/40 mb-6 flex items-center justify-center">
            {selfiePreviewUrl ? (
              <img src={selfiePreviewUrl} alt="Selfie Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
                <div className="absolute inset-4 rounded-full border-2 border-dashed border-white/60 pointer-events-none animate-pulse"></div>
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Controls */}
          {selfiePreviewUrl ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSelfiePreviewUrl(null);
                  setSelfieBlob(null);
                  startCamera();
                }}
                className="neu-btn-secondary py-3 px-5 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4 text-[#E86A5B]" />
                <span>Retake</span>
              </button>
              <button
                onClick={runMatching}
                className="btn-primary py-3 px-7 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Find My Photos with AI</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={capturePhoto}
                className="btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#E86A5B]/25"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Selfie</span>
              </button>

              <div className="flex items-center justify-center gap-3">
                <label className="text-xs font-bold text-[#E86A5B] hover:underline cursor-pointer">
                  <span>Upload from Gallery instead</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleSelfieFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: AI MATCHING PROGRESS */}
      {step === 'MATCHING' && (
        <div className="p-10 rounded-3xl neu-card text-center">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#E86A5B]/20 animate-ping"></div>
            <div className="w-16 h-16 rounded-full bg-[#E86A5B] text-white flex items-center justify-center shadow-lg shadow-[#E86A5B]/30">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          </div>
          <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-2">Analyzing Facial Vectors...</h2>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed">
            Searching thousands of event photos with sub-50ms vector cosine similarity. Your moments are arriving...
          </p>
        </div>
      )}

      {/* STEP 6: GALLERY & RESULT DASHBOARD */}
      {step === 'GALLERY' && (
        <div className="space-y-6">
          {/* Guest Identity & Actions Bar */}
          <div className="p-4 sm:p-5 rounded-2xl neu-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF9F7]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                {name ? name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-extrabold text-sm text-[#1F1F1F] truncate">
                    {name || 'Guest'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200 shrink-0">
                    AI Active
                  </span>
                </div>
                <span className="text-[11px] text-[#6B6B6B] font-mono">
                  {matchResult?.matched_count || 0} moments matched
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleRetakeSelfie}
                className="px-3 py-1.5 rounded-xl neu-btn-secondary text-xs font-bold text-[#E86A5B] flex items-center gap-1 cursor-pointer"
                title="Retake Selfie"
              >
                <Camera className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>Update Selfie</span>
              </button>
              <button
                onClick={() => handleSignOut(true)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Switch Guest / Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-[#EBE8E1]">
            <button
              onClick={() => setActiveGuestTab('AI_SEARCH')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeGuestTab === 'AI_SEARCH'
                  ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                  : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>My Photos ({matchResult?.matched_count || 0})</span>
            </button>
            {event?.allow_guest_uploads && (
              <button
                onClick={() => setActiveGuestTab('GUEST_UPLOAD')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeGuestTab === 'GUEST_UPLOAD'
                    ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                    : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Moments</span>
              </button>
            )}
            {folders.length > 0 && (
              <button
                onClick={() => setActiveGuestTab('FOLDERS')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeGuestTab === 'FOLDERS'
                    ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                    : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ceremonies</span>
              </button>
            )}
          </div>

          {/* TAB 1: AI MATCHED PHOTOS */}
          {activeGuestTab === 'AI_SEARCH' && (
            <div>
              {matchResult && matchResult.matched_photos.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-[#1F1F1F]">
                      Found {matchResult.matched_photos.length} moments containing your face
                    </span>
                    <button
                      onClick={shareMatchOnWhatsApp}
                      className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {matchResult.matched_photos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        className="group relative aspect-square rounded-2xl overflow-hidden neu-card border border-[#E8E5E2] cursor-pointer"
                      >
                        <img
                          src={`${api.getApiBaseUrl().replace('/api/v1', '')}${photo.thumbnail_url}`}
                          alt={photo.original_file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {photo.folder_name && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white">
                            {photo.folder_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-10 rounded-3xl neu-card text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF9F7] text-[#6B6B6B] flex items-center justify-center mx-auto mb-4 border border-[#E8E5E2]">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-display font-extrabold text-[#1F1F1F] mb-1">No Matching Moments Found Yet</h3>
                  <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto mb-5">
                    Photographer is still shooting and indexing photos. As new shots arrive, they will appear here!
                  </p>
                  <button
                    onClick={handleRetakeSelfie}
                    className="btn-primary py-2.5 px-6 text-xs font-bold"
                  >
                    Try with a Different Selfie
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GUEST PHOTO UPLOAD */}
          {activeGuestTab === 'GUEST_UPLOAD' && (
            <div className="p-6 sm:p-8 rounded-3xl neu-card text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#E86A5B]/10 text-[#E86A5B] flex items-center justify-center mx-auto mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-display font-extrabold text-[#1F1F1F] mb-1">Add Your Captured Memories</h3>
              <p className="text-xs text-[#6B6B6B] max-w-md mx-auto mb-6">
                Captured great candids or selfies on your phone? Add them to the wedding album so the bride &amp; groom can see!
              </p>

              {guestUploadProgress && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-5">
                  {guestUploadProgress}
                </div>
              )}

              <div className="max-w-xs mx-auto space-y-3 mb-6 text-left">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1F1F] mb-1">Your Name</label>
                  <input
                    type="text"
                    value={guestUploadName || name}
                    onChange={(e) => setGuestUploadName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="gmm-input w-full !py-2.5 text-xs"
                  />
                </div>
              </div>

              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                ref={guestFileInputRef}
                onChange={(e) => handleGuestPhotosUpload(e.target.files)}
                className="hidden"
              />

              <button
                type="button"
                disabled={guestUploading}
                onClick={() => guestFileInputRef.current?.click()}
                className="btn-primary py-3 px-8 text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E86A5B]/25"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{guestUploading ? 'Uploading...' : 'Choose Photos from Phone'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: CEREMONY FOLDERS */}
          {activeGuestTab === 'FOLDERS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl neu-card bg-[#FAF9F7] border border-[#E8E5E2] text-left cursor-pointer hover:border-[#E86A5B]/40 transition-all"
                  >
                    <FolderIcon className="w-5 h-5 text-[#E86A5B] mb-2" />
                    <h4 className="text-xs font-bold text-[#1F1F1F] truncate">{f.name}</h4>
                    <span className="text-[10px] text-[#6B6B6B]">{f.photo_count} photos</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={`${api.getApiBaseUrl().replace('/api/v1', '')}${selectedPhoto.download_url}`}
              alt={selectedPhoto.original_file_name}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
            />

            <div className="mt-4 flex items-center gap-3">
              <a
                href={`${api.getApiBaseUrl().replace('/api/v1', '')}${selectedPhoto.download_url}`}
                download={selectedPhoto.original_file_name}
                className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download High-Res Photo</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
