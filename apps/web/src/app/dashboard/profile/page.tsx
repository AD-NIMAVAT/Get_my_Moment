'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, PhotographerProfileDetail } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { NeomorphicSelect } from '@/components/NeomorphicSelect';
import { 
  Crown, Sparkles, ShieldCheck, HardDrive, Calendar, Camera, 
  Check, ArrowRight, Instagram, Globe, MapPin, Building, Phone, 
  Mail, Edit3, Save, AlertCircle, RefreshCw, Zap, ArrowUpRight, 
  Award, CheckCircle2, FileText, Download, CreditCard, Lock, QrCode,
  UploadCloud, Trash2, Stamp, Image as ImageIcon, HelpCircle, Send,
  MessageSquare, ExternalLink, LifeBuoy
} from 'lucide-react';

interface PlanDef {
  key: string;
  name: string;
  price: string;
  annualPrice: string;
  monthlyPriceNum: number;
  annualPriceNum: number;
  period: string;
  popular?: boolean;
  color: string;
  storage: string;
  eventsLimit: string;
  features: string[];
}

interface InvoiceItem {
  id: string;
  invoice_number: string;
  plan_name: string;
  invoice_date: string;
  billing_period_start: string;
  billing_period_end: string;
  taxable_amount_inr: number;
  total_tax_inr: number;
  total_amount_inr: number;
  status: string;
  buyer_studio_name: string;
  seller_legal_name: string;
}

const PRICING_PLANS: PlanDef[] = [
  {
    key: 'FREE_TRIAL',
    name: 'Free Trial',
    price: '₹0',
    annualPrice: '₹0',
    monthlyPriceNum: 0,
    annualPriceNum: 0,
    period: '/forever',
    color: 'border-[#E8E5E2] bg-white',
    storage: '5 GB Cloud Storage',
    eventsLimit: '1 Event Gallery',
    features: [
      'High-Speed Photo Uploader',
      'AI Face Recognition (100 Photos)',
      'Watermarked Guest Gallery',
      'Standard Download Speed',
    ],
  },
  {
    key: 'SOLO_PRO',
    name: 'Solo Pro',
    price: '₹599',
    annualPrice: '₹5,750',
    monthlyPriceNum: 599,
    annualPriceNum: 5750,
    period: '/month',
    popular: true,
    color: 'border-2 border-[#E86A5B] bg-white shadow-lg shadow-primary-500/10',
    storage: '100 GB Cloud Storage',
    eventsLimit: '10 Events / month',
    features: [
      'Instant AI Facial Recognition & Matching',
      'Instant WhatsApp Guest Delivery Links',
      'High-Resolution Original Downloads',
      'Live Event Attendance Telemetry',
      'Selfie Search for All Wedding Guests',
      'Studio Watermark Protection',
    ],
  },
  {
    key: 'STUDIO_PRO',
    name: 'Studio Pro',
    price: '₹1,999',
    annualPrice: '₹19,190',
    monthlyPriceNum: 1999,
    annualPriceNum: 19190,
    period: '/month',
    color: 'border-[#E8E5E2] hover:border-[#E86A5B] bg-white shadow-sm',
    storage: '500 GB Cloud Storage',
    eventsLimit: '30 Events / month',
    features: [
      'Everything in Solo Pro',
      'Client Selection Portal (Favorites & Selections)',
      'Ceremony-wise Photo Categorization',
      'Custom Studio Branding & Logo Watermark',
      'Direct WhatsApp Leads Capture Widget',
      'Priority AI GPU Vector Indexing',
    ],
  },
  {
    key: 'STUDIO_OS',
    name: 'Studio OS Complete',
    price: '₹4,999',
    annualPrice: '₹47,990',
    monthlyPriceNum: 4999,
    annualPriceNum: 47990,
    period: '/month',
    color: 'border-2 border-[#D9A441] bg-white shadow-lg shadow-secondary-500/10',
    storage: '2 TB (2,048 GB) Storage',
    eventsLimit: 'Unlimited Events',
    features: [
      'Complete CRM & Lead Pipeline Tracker',
      'Automated Quotation & Milestone Generator',
      'Studio Availability Calendar & Date Blocker',
      'Payment Milestones & Advance Tracker',
      'Unlimited Guest AI Face Searches',
      'Dedicated WhatsApp Business Auto-Pilot',
    ],
  },
  {
    key: 'ENTERPRISE_VIP',
    name: 'Enterprise VIP',
    price: '₹9,999',
    annualPrice: '₹95,990',
    monthlyPriceNum: 9999,
    annualPriceNum: 95990,
    period: '/month',
    color: 'border-[#E8E5E2] bg-white shadow-sm',
    storage: '10 TB Dedicated Storage',
    eventsLimit: 'Unlimited Events & Team Seats',
    features: [
      'Everything in Studio OS',
      'Multi-User Team & Assistant Logins',
      'Custom Domain (e.g. photos.yourstudio.com)',
      'Dedicated GPU Vector Search Node',
      '24/7 Priority WhatsApp VIP Support',
    ],
  },
];

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

export default function ProfileAndPricingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<PhotographerProfileDetail | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'invoices' | 'profile' | 'branding' | 'support'>('plan');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  // Studio Branding States
  const [logoUploading, setLogoUploading] = useState(false);
  const [sigUploading, setSigUploading] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  // Support & Issue Ticket States
  const [ticketCategory, setTicketCategory] = useState('UPLOAD_SYNC');
  const [ticketUrgency, setTicketUrgency] = useState('NORMAL');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketEventRef, setTicketEventRef] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedTicketRef, setSubmittedTicketRef] = useState<string | null>(null);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [studioName, setStudioName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('3 - 5 Years (Established Pro)');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [gstNumber, setGstNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Upgrade & Checkout Modal
  const [planToCheckout, setPlanToCheckout] = useState<PlanDef | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast.error('Please fill in the subject and issue details.');
      return;
    }
    setSubmittingTicket(true);
    try {
      const res = await api.submitPhotographerTicket({
        category: ticketCategory,
        urgency: ticketUrgency,
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        event_reference_id: ticketEventRef.trim() || undefined,
      });
      setSubmittedTicketRef(res.ticket_id);
      toast.success(res.message);
      setTicketSubject('');
      setTicketDescription('');
      setTicketEventRef('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit support ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadProfile();
      loadInvoices();
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getDetailedProfile();
      setProfile(data);
      setStudioName(data.studio_name || '');
      setPhone(data.phone || '');
      setCity(data.city || '');
      setStateName(data.state || '');
      setInstagramHandle(data.instagram_handle || '');
      setPortfolioUrl(data.portfolio_url || '');
      setYearsOfExperience(data.years_of_experience || '3 - 5 Years (Established Pro)');
      setGstNumber(data.gst_number || '');
      setWatermarkText(data.watermark_text || '');
      if (data.specializations) {
        setSelectedSpecializations(data.specializations.split(',').map((s) => s.trim()));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load studio profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoUploading(true);
      await api.uploadStudioLogo(file);
      await loadProfile();
      toast.success('Studio Logo uploaded! It is now live on client galleries and invoices.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSigUploading(true);
      await api.uploadStudioSignature(file);
      await loadProfile();
      toast.success('Authorized Signature & Stamp uploaded! It is now stamped on client invoices.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload signature');
    } finally {
      setSigUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to remove your custom studio logo?')) return;
    try {
      await api.deleteStudioLogo();
      await loadProfile();
      toast.success('Custom logo removed. Default studio header restored.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove logo');
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm('Are you sure you want to remove your digital signature / stamp?')) return;
    try {
      await api.deleteStudioSignature();
      await loadProfile();
      toast.success('Digital signature removed from invoices.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove signature');
    }
  };

  const handleSaveWatermark = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingBranding(true);
      await api.updateStudioBranding({ watermark_text: watermarkText.trim() || undefined });
      await loadProfile();
      toast.success('Watermark & tagline preferences saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save watermark settings');
    } finally {
      setSavingBranding(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const data = await api.getSubscriptionInvoices();
      setInvoices(data);
    } catch (err) {
      // silent
    }
  };

  const toggleSpecialization = (spec: string) => {
    if (selectedSpecializations.includes(spec)) {
      setSelectedSpecializations(selectedSpecializations.filter((s) => s !== spec));
    } else {
      setSelectedSpecializations([...selectedSpecializations, spec]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim()) {
      toast.error('Studio name is required');
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await api.updateDetailedProfile({
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

      setProfile(updated);
      setIsEditing(false);
      toast.success('Studio Profile & Verification details updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update studio profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Checkout Modal & Create Order
  const handleInitiateCheckout = async (plan: PlanDef) => {
    setPlanToCheckout(plan);
    setPaymentSuccessData(null);
    try {
      const order = await api.createSubscriptionOrder({
        plan_key: plan.key,
        billing_cycle: billingCycle,
        buyer_state: profile?.state || 'Gujarat'
      });
      setCheckoutOrder(order);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create payment order');
    }
  };

  // Confirm Payment & Verify Signature
  const handleCompletePayment = async () => {
    if (!checkoutOrder) return;
    setProcessingPayment(true);

    try {
      // Simulate/Trigger Gateway Verification
      const res = await api.verifySubscriptionPayment({
        gateway_order_id: checkoutOrder.gateway_order_id,
        gateway_payment_id: `pay_${Date.now()}`,
        gateway_signature: `test_sig_verified_${Date.now()}`,
        payment_method: selectedMethod,
        payment_method_details: selectedMethod === 'UPI' ? 'GPay / PhonePe UPI' : 'Credit / Debit Card'
      });

      setPaymentSuccessData(res);
      toast.success(`🎉 Upgrade Successful! Your studio is now on ${res.plan_name}`);
      await Promise.all([loadProfile(), loadInvoices()]);
    } catch (err: any) {
      toast.error(err.message || 'Payment verification failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (authLoading || (loading && !profile)) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <div className="h-44 rounded-3xl skeleton-shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-40 rounded-3xl skeleton-shimmer" />
            <div className="h-40 rounded-3xl skeleton-shimmer" />
            <div className="h-40 rounded-3xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const currentPlanDef = PRICING_PLANS.find((p) => p.key === profile?.subscription_plan) || PRICING_PLANS[1];
  const storagePercentage = profile ? Math.min(100, Math.round((profile.storage_used_gb / profile.max_storage_gb) * 100)) : 0;
  const eventsPercentage = profile ? Math.min(100, Math.round((profile.monthly_events_used / profile.max_events_per_month) * 100)) : 0;

  return (
    <div className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      {/* Hero Studio Banner */}
      <div className="p-7 sm:p-8 rounded-3xl neu-card relative overflow-hidden mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-[#EE7E6F] via-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold text-2xl shadow-[6px_6px_14px_#D4D0C7,-6px_-6px_14px_#FFFFFF] flex-shrink-0">
              <Camera className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
                  {profile?.studio_name}
                </h1>
                {profile?.is_verified ? (
                  <span className="px-3 py-1 rounded-full bg-[#D9A441]/15 text-[#8F6420] text-xs font-bold flex items-center gap-1.5 neu-pill">
                    <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>Verified Studio Pro ✨</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-1.5 neu-pill">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>KYC Verification In Review</span>
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#3FA66B] neu-pill">
                  {profile?.subscription_status}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-[#6B6B6B] flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#8E8E8E]" />
                  <span>{profile?.email}</span>
                </span>
                {profile?.phone && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-[#8E8E8E]" />
                    <span>{profile?.phone}</span>
                  </span>
                )}
                {profile?.city && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#8E8E8E]" />
                    <span>{profile?.city}{profile?.state ? `, ${profile?.state}` : ''}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="neu-btn-secondary py-2.5 px-4 text-xs"
            >
              Dashboard Events
            </Link>
            <button
              onClick={() => {
                setActiveTab(activeTab === 'plan' ? 'profile' : 'plan');
                setIsEditing(false);
              }}
              className="btn-primary py-2.5 px-4 text-xs"
            >
              {activeTab === 'plan' ? (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Studio Profile</span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5" />
                  <span>View Pricing & Plans</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-8 p-1.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] w-fit flex-wrap">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'plan'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Active Plan & Upgrade</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tax Invoices & Billing ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Studio Identity & KYC</span>
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'branding'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Studio Branding & Signature</span>
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'support'
                ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Issue Support</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PRICING PLANS & QUOTA DASHBOARD */}
      {activeTab === 'plan' && (
        <div className="space-y-10">
          {/* Active Plan Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="neu-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Current Tier</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E86A5B]/15 text-[#E86A5B] neu-pill">
                  {profile?.subscription_status}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-4">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] font-display">{currentPlanDef.name}</span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-2">
                Valid until: <strong className="text-[#1F1F1F]">{profile?.subscription_valid_until ? new Date(profile.subscription_valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active'}</strong>
              </p>
            </div>

            <div className="neu-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Cloud Storage</span>
                <HardDrive className="w-4 h-4 text-[#E86A5B]" />
              </div>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-extrabold text-[#1F1F1F]">{profile?.storage_used_gb.toFixed(1)}</span>
                <span className="text-xs text-[#6B6B6B] font-medium">/ {profile?.max_storage_gb} GB</span>
              </div>
              <div className="w-full bg-[#EBE8E1] rounded-full h-2.5 mt-4 shadow-[inset_1px_1px_3px_#D1CDC4,inset_-1px_-1px_3px_#FFFFFF] overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#E86A5B] to-[#C94F43] h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(5, storagePercentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-[11px] text-[#6B6B6B] font-medium">
                <span>{storagePercentage}% Quota utilized</span>
                <span>{profile?.total_photos} Total Photos</span>
              </div>
            </div>

            <div className="neu-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Events Created</span>
                <Calendar className="w-4 h-4 text-[#D9A441]" />
              </div>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-extrabold text-[#1F1F1F]">{profile?.total_events}</span>
                <span className="text-xs text-[#6B6B6B] font-medium">Total Active Events</span>
              </div>
              <div className="w-full bg-[#EBE8E1] rounded-full h-2.5 mt-4 shadow-[inset_1px_1px_3px_#D1CDC4,inset_-1px_-1px_3px_#FFFFFF] overflow-hidden">
                <div 
                  className="bg-[#D9A441] h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max(5, eventsPercentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-[11px] text-[#6B6B6B] font-medium">
                <span>{profile?.monthly_events_used} this month</span>
                <span>Limit: {profile?.max_events_per_month}/mo</span>
              </div>
            </div>
          </div>

          {/* Pricing Tiers Comparison Grid */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#E86A5B] bg-[#E86A5B]/10 border border-[#E86A5B]/20 mb-3">
                <Crown className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>STUDIO UPGRADE TIERS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
                Scale Your Photography Brand
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-2">
                Instant Razorpay & UPI activation. Funds settle directly into your bank account with official GST tax invoices.
              </p>

              {/* Billing Cycle Switcher */}
              <div className="mt-6 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF]">
                <button
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF]'
                      : 'text-[#6B6B6B]'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  onClick={() => setBillingCycle('ANNUAL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingCycle === 'ANNUAL'
                      ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF]'
                      : 'text-[#6B6B6B]'
                  }`}
                >
                  <span>Annual Billing</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">SAVE 20%</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {PRICING_PLANS.map((p) => {
                const isCurrent = profile?.subscription_plan === p.key;
                const displayPrice = billingCycle === 'ANNUAL' ? p.annualPrice : p.price;
                const displayPeriod = billingCycle === 'ANNUAL' ? '/year' : p.period;

                return (
                  <div
                    key={p.key}
                    className={`rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 relative ${
                      isCurrent
                        ? 'border-2 border-[#E86A5B] bg-white shadow-xl shadow-primary-500/10'
                        : `${p.color} hover:border-[#F3A08F] shadow-sm hover:shadow-md`
                    }`}
                  >
                    {p.popular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#E86A5B] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        Most Popular
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#E86A5B] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Active Plan</span>
                      </div>
                    )}

                    <div>
                      <h3 className="font-display font-extrabold text-lg text-[#1F1F1F]">{p.name}</h3>

                      <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-3xl font-extrabold text-[#1F1F1F]">{displayPrice}</span>
                        <span className="text-xs text-[#6B6B6B] font-medium">{displayPeriod}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-[#E8E5E2] space-y-1 text-xs">
                        <div className="font-bold text-[#E86A5B]">{p.storage}</div>
                        <div className="text-[#6B6B6B] text-[11px] font-medium">{p.eventsLimit}</div>
                      </div>

                      <ul className="mt-5 space-y-2.5 text-xs text-[#1F1F1F]">
                        {p.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#E86A5B] flex-shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-relaxed text-[#6B6B6B]">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#E8E5E2]">
                      {isCurrent ? (
                        <div className="w-full py-2.5 rounded-xl bg-[#E86A5B]/10 text-[#E86A5B] text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" />
                          <span>Currently Active</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInitiateCheckout(p)}
                          className="w-full py-2.5 rounded-xl bg-[#E86A5B] hover:bg-[#C94F43] text-white text-xs font-bold shadow-md shadow-primary-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                        >
                          <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Pay & Upgrade</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TAX INVOICES & BILLING */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="neu-card p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2DDD5]">
              <div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Official GST Tax Invoices</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Download or print sequential GST compliance invoices for your accounting records.</p>
              </div>
              <div className="text-xs text-[#6B6B6B] font-mono">
                Seller GSTIN: <strong className="text-[#1F1F1F]">24AAACG1234F1Z5</strong>
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#6B6B6B]">
                <FileText className="w-10 h-10 text-[#8E8E8E] mx-auto mb-2 opacity-50" />
                <span>No subscription invoices generated yet. Upgrade your plan to receive tax invoices.</span>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2DDD5] text-[#6B6B6B] uppercase text-[10px]">
                      <th className="pb-3 font-bold">Invoice Number</th>
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold">Plan Name</th>
                      <th className="pb-3 font-bold">Taxable Amount</th>
                      <th className="pb-3 font-bold">18% GST</th>
                      <th className="pb-3 font-bold">Total Paid</th>
                      <th className="pb-3 font-bold">Status</th>
                      <th className="pb-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD5]">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#FAF9F7]">
                        <td className="py-3.5 font-bold font-mono text-[#E86A5B]">{inv.invoice_number}</td>
                        <td className="py-3.5 text-[#6B6B6B]">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-3.5 font-bold text-[#1F1F1F]">{inv.plan_name}</td>
                        <td className="py-3.5 text-[#1F1F1F]">₹{inv.taxable_amount_inr.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 text-[#6B6B6B]">₹{inv.total_tax_inr.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 font-extrabold text-[#1F1F1F]">₹{inv.total_amount_inr.toLocaleString('en-IN')}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#3FA66B] font-bold text-[10px] border border-emerald-200">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const url = api.getInvoiceHtmlUrl(inv.id, true);
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="neu-btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1 cursor-pointer hover:text-[#E86A5B]"
                            title="Print or Save official GST Tax Invoice as PDF"
                          >
                            <Download className="w-3 h-3 text-[#E86A5B]" />
                            <span>Print / PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STUDIO IDENTITY & KYC */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="neu-card p-7 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2DDD5] mb-6">
              <div>
                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F]">Studio Identity & Business Details</h3>
                <p className="text-xs text-[#6B6B6B] mt-0.5">These details appear on your client galleries, watermark stamps, and invoices.</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Studio Brand Name *</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="neu-input w-full text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Studio Phone Number</label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="neu-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">City / Base</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="neu-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">State (for GST compliance)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="neu-input w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Studio GSTIN (Optional)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="e.g. 24AAACG1234F1Z5"
                    className="neu-input w-full text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Instagram Handle</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@yourstudiophotography"
                    className="neu-input w-full text-xs"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DDD5]">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="neu-btn-secondary py-2.5 px-4 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-primary py-2.5 px-5 text-xs flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: STUDIO BRANDING, CUSTOM LOGO & DIGITAL SIGNATURE */}
      {activeTab === 'branding' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Custom Studio Logo Card */}
            <div className="neu-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EE7E6F] to-[#E86A5B] flex items-center justify-center text-white shadow-md">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1F1F1F]">Studio Official Logo</h3>
                    <p className="text-xs text-[#6B6B6B]">Appears on QR Galleries, Invoices & Quotes</p>
                  </div>
                </div>
                {profile?.logo_url && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 neu-pill">
                    Active Logo
                  </span>
                )}
              </div>

              {/* Logo Preview Area */}
              <div className="p-6 rounded-2xl bg-[#EBE8E1] border border-[#D4D0C7] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] flex flex-col items-center justify-center min-h-[160px] text-center relative overflow-hidden">
                {profile?.logo_url ? (
                  <div className="relative group">
                    <img
                      src={`${api.getApiBaseUrl().replace('/api/v1', '')}${profile.logo_url}?t=${Date.now()}`}
                      alt={profile.studio_name}
                      className="max-h-24 max-w-[240px] object-contain rounded-xl drop-shadow-md"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 text-[#6B6B6B]">
                    <ImageIcon className="w-10 h-10 mx-auto opacity-40 text-[#1F1F1F]" />
                    <p className="text-xs font-medium">No custom logo uploaded yet.</p>
                    <p className="text-[11px] text-[#6B6B6B]">Using default Studio Name header.</p>
                  </div>
                )}
              </div>

              {/* Upload & Action Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex-1 btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md">
                    <UploadCloud className="w-4 h-4" />
                    <span>{logoUploading ? 'Uploading Logo...' : (profile?.logo_url ? 'Replace Studio Logo' : 'Upload Studio Logo')}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleUploadLogo}
                      disabled={logoUploading}
                      className="hidden"
                    />
                  </label>
                  {profile?.logo_url && (
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Remove Custom Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#6B6B6B]">Recommended: Transparent PNG or High-Res JPG (Min 400x150px, Max 10MB).</p>
              </div>
            </div>

            {/* 2. Authorized Signature & Stamp Card */}
            <div className="neu-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D9A441] to-[#B38024] flex items-center justify-center text-white shadow-md">
                    <Stamp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1F1F1F]">Authorized Signature / Stamp</h3>
                    <p className="text-xs text-[#6B6B6B]">Printed on official Client Invoices & Estimates</p>
                  </div>
                </div>
                {profile?.signature_url && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 neu-pill">
                    Active Signature
                  </span>
                )}
              </div>

              {/* Signature Preview Area */}
              <div className="p-6 rounded-2xl bg-[#EBE8E1] border border-[#D4D0C7] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] flex flex-col items-center justify-center min-h-[160px] text-center relative overflow-hidden">
                {profile?.signature_url ? (
                  <div className="relative group">
                    <img
                      src={`${api.getApiBaseUrl().replace('/api/v1', '')}${profile.signature_url}?t=${Date.now()}`}
                      alt="Authorized Signature"
                      className="max-h-20 max-w-[200px] object-contain rounded-lg drop-shadow"
                    />
                    <p className="text-[10px] text-[#6B6B6B] mt-2 font-mono uppercase tracking-wider">Authorized Signatory</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-[#6B6B6B]">
                    <Stamp className="w-10 h-10 mx-auto opacity-40 text-[#1F1F1F]" />
                    <p className="text-xs font-medium">No signature or stamp uploaded.</p>
                    <p className="text-[11px] text-[#6B6B6B]">Invoices will have blank signatory line.</p>
                  </div>
                )}
              </div>

              {/* Upload & Action Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex-1 btn-primary py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md bg-gradient-to-r from-[#D9A441] to-[#B38024]">
                    <UploadCloud className="w-4 h-4" />
                    <span>{sigUploading ? 'Uploading Signature...' : (profile?.signature_url ? 'Replace Signature / Stamp' : 'Upload Signature / Stamp')}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleUploadSignature}
                      disabled={sigUploading}
                      className="hidden"
                    />
                  </label>
                  {profile?.signature_url && (
                    <button
                      type="button"
                      onClick={handleDeleteSignature}
                      className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Remove Digital Signature"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-[#6B6B6B]">Recommended: Transparent PNG of signature or official studio round stamp.</p>
              </div>
            </div>
          </div>

          {/* 3. Watermark & Tagline Setting */}
          <div className="neu-card p-6 sm:p-8 space-y-5">
            <div className="border-b border-[#E2DDD5] pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#1F1F1F]">Gallery Watermark & Tagline</h3>
                <p className="text-xs text-[#6B6B6B]">Custom copyright notice stamped on client gallery previews</p>
              </div>
              <Sparkles className="w-5 h-5 text-[#E86A5B]" />
            </div>

            <form onSubmit={handleSaveWatermark} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Custom Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder={`© ${profile?.studio_name || 'Your Studio Name'} Photography`}
                  className="neu-input w-full text-xs"
                />
                <p className="text-[11px] text-[#6B6B6B] mt-1.5">
                  Leave blank to use default copyright <code>© {profile?.studio_name || 'Studio'} 2026</code>.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 font-bold"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingBranding ? 'Saving...' : 'Save Watermark Preferences'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: HELP & ISSUE SUPPORT DESK */}
      {activeTab === 'support' && (
        <div className="space-y-8 animate-tab-fade">
          {/* Top Banner */}
          <div className="p-6 sm:p-7 rounded-3xl neu-card bg-gradient-to-r from-[#FAF9F7] to-[#F3F1EC] border border-[#E8E5E2] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-[#E86A5B]/15 text-[#E86A5B] mb-2 neu-pill">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>STUDIO PRIORITY ASSISTANCE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#1F1F1F]">
                Studio Helpdesk & Issue Resolution Center
              </h2>
              <p className="text-xs text-[#6B6B6B] mt-1 max-w-xl">
                Encountering an upload bug, have a billing question, or need live assistance during an event shoot? Submit a ticket or connect with our engineering team directly.
              </p>
            </div>

            {/* Direct WhatsApp VIP Button */}
            <button
              type="button"
              onClick={() => {
                const msg = encodeURIComponent(
                  `Hello Get My Moment Support! 📸\n\nStudio Name: ${profile?.studio_name || 'My Studio'}\nPlan: ${profile?.subscription_plan || 'TRIAL'}\nStudio ID: ${profile?.id || 'N/A'}\nEmail: ${profile?.email || 'N/A'}\n\nI need priority assistance with:`
                );
                window.open(`https://wa.me/919662086550?text=${msg}`, '_blank');
              }}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 cursor-pointer self-start md:self-auto flex-shrink-0"
            >
              <span>💬 1-Click VIP WhatsApp Support</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Issue Reporting Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="neu-card p-6 sm:p-8 space-y-5">
                <div className="border-b border-[#E2DDD5] pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-[#1F1F1F]">Log a Technical Ticket / Issue</h3>
                    <p className="text-xs text-[#6B6B6B]">Directly assigned to the platform reliability team</p>
                  </div>
                  <HelpCircle className="w-5 h-5 text-[#E86A5B]" />
                </div>

                {submittedTicketRef && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#3FA66B] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold">Ticket Successfully Created!</h4>
                      <p className="text-[11px] mt-0.5 text-emerald-700">
                        Ticket Reference: <strong className="font-mono">{submittedTicketRef}</strong>. Our engineers have been alerted with your studio credentials.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  {/* Readonly Studio Context Pill */}
                  <div className="p-3.5 rounded-2xl bg-[#EBE8E1] text-xs flex flex-wrap items-center justify-between gap-2 shadow-[inset_2px_2px_4px_#D1CDC4]">
                    <div>
                      <span className="text-[#6B6B6B] font-medium">Logged in Studio: </span>
                      <strong className="text-[#1F1F1F]">{profile?.studio_name || user?.studio_name}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E86A5B]/15 text-[#E86A5B] font-bold">
                        {profile?.subscription_plan || 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Issue Category *</label>
                      <NeomorphicSelect
                        value={ticketCategory}
                        onChange={setTicketCategory}
                        options={[
                          { value: 'UPLOAD_SYNC', label: '📸 Uploads & Wireless Camera Sync' },
                          { value: 'AI_FACE_SEARCH', label: '⚡ AI Face Matching / QR Gallery' },
                          { value: 'BILLING_GST', label: '💰 GST Invoices, Billing & Upgrades' },
                          { value: 'FEATURE_REQUEST', label: '💡 Feature Request / Suggestion' },
                          { value: 'URGENT_SHOOT_HELP', label: '🚨 Urgent Live Event Assistance' },
                          { value: 'OTHER', label: '🔧 Other Query' },
                        ]}
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Urgency Level</label>
                      <NeomorphicSelect
                        value={ticketUrgency}
                        onChange={setTicketUrgency}
                        options={[
                          { value: 'NORMAL', label: '🟢 Normal (Within 24 Hours)' },
                          { value: 'HIGH', label: '🟡 High (Within 4 Hours)' },
                          { value: 'URGENT', label: '🔴 Critical (Live Event In Progress)' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Issue Title / Subject *</label>
                      <input
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="e.g. FTP Camera disconnects after 50 photos"
                        className="neu-input w-full text-xs"
                      />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Event Reference / ID (Optional)</label>
                      <input
                        type="text"
                        value={ticketEventRef}
                        onChange={(e) => setTicketEventRef(e.target.value)}
                        placeholder="e.g. Event Name or Token"
                        className="neu-input w-full text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Detailed Description & Steps *</label>
                    <textarea
                      rows={4}
                      required
                      value={ticketDescription}
                      onChange={(e) => setTicketDescription(e.target.value)}
                      placeholder="Please explain what happened, what device or browser you were using, and how we can help..."
                      className="neu-input w-full text-xs resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: Studio Quick Troubleshooting & Desk Contacts (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Quick Contacts */}
              <div className="neu-card p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#E86A5B]">Direct Engineering Reach</h3>
                
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E86A5B]/15 text-[#E86A5B] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B6B6B] block font-medium">Studio Support Email</span>
                    <a href="mailto:getmymoments@gmail.com" className="text-xs font-bold text-[#1F1F1F] hover:text-[#E86A5B]">
                      getmymoments@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[#E2DDD5]">
                  <div className="w-9 h-9 rounded-xl bg-[#3FA66B]/15 text-[#3FA66B] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B6B6B] block font-medium">Direct Phone / WhatsApp</span>
                    <a href="tel:+919662086550" className="text-xs font-bold text-[#1F1F1F] font-mono hover:text-[#3FA66B] block">
                      +91 96620 86550
                    </a>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="neu-card p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">Studio Best Practices</h3>
                
                <div className="space-y-3 text-xs text-[#6B6B6B]">
                  <div className="p-3 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2]">
                    <strong className="text-[#1F1F1F] block mb-0.5">📸 Wireless Camera Ingest:</strong>
                    Ensure your camera is connected to the same Wi-Fi router as your local laptop and FTP port is set to <code>2121</code>.
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2]">
                    <strong className="text-[#1F1F1F] block mb-0.5">⚡ AI Face Recognition:</strong>
                    Photos with clear lighting yield &gt;95% confidence matches. High-res files are automatically optimized.
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2]">
                    <strong className="text-[#1F1F1F] block mb-0.5">💰 GST Invoices:</strong>
                    Upload your digital stamp and signature in the <em>Studio Branding</em> tab to stamp outgoing client invoices automatically.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAZORPAY / UPI PAYMENT CHECKOUT MODAL */}
      {planToCheckout && checkoutOrder && (
        <Modal
          isOpen={true}
          onClose={() => {
            setPlanToCheckout(null);
            setCheckoutOrder(null);
            setPaymentSuccessData(null);
          }}
          title={paymentSuccessData ? "🎉 Payment Confirmed!" : "Secure Gateway Checkout"}
          size="md"
        >
          {paymentSuccessData ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-display font-extrabold text-[#1F1F1F]">
                {paymentSuccessData.plan_name} Activated!
              </h3>
              <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto">
                Your subscription has been activated with <strong>{paymentSuccessData.storage_gb} GB</strong> high-speed cloud storage until <strong>{new Date(paymentSuccessData.valid_until).toLocaleDateString()}</strong>.
              </p>

              <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] text-xs font-mono space-y-1 text-left">
                <div><strong>Invoice:</strong> {paymentSuccessData.invoice_number}</div>
                <div><strong>Amount Paid:</strong> ₹{paymentSuccessData.amount_paid_inr.toLocaleString('en-IN')} (Inclusive of 18% GST)</div>
                <div><strong>Settlement:</strong> Direct Bank Account Deposit (T+1 Daily)</div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setPlanToCheckout(null);
                    setCheckoutOrder(null);
                    setPaymentSuccessData(null);
                    setActiveTab('invoices');
                  }}
                  className="btn-primary py-2.5 px-5 text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Tax Invoice</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1F1F1F]">{checkoutOrder.plan_name} ({checkoutOrder.billing_cycle})</span>
                  <span className="font-mono font-bold">₹{checkoutOrder.taxable_amount_inr.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span>18% GST ({checkoutOrder.cgst_inr > 0 ? 'CGST 9% + SGST 9%' : 'IGST 18%'})</span>
                  <span className="font-mono">₹{checkoutOrder.total_tax_inr.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-[#E2DDD5] flex items-center justify-between text-sm font-extrabold text-[#E86A5B]">
                  <span>Total Payable</span>
                  <span className="font-mono text-base">₹{checkoutOrder.amount_inr.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-[#1F1F1F]">Select Payment Mode</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('UPI')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      selectedMethod === 'UPI'
                        ? 'border-[#E86A5B] bg-[#E86A5B]/10 text-[#E86A5B] font-bold'
                        : 'border-[#E2DDD5] text-[#6B6B6B]'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-[11px]">UPI / GPay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('CARD')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      selectedMethod === 'CARD'
                        ? 'border-[#E86A5B] bg-[#E86A5B]/10 text-[#E86A5B] font-bold'
                        : 'border-[#E2DDD5] text-[#6B6B6B]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[11px]">Card / Debit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('NETBANKING')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      selectedMethod === 'NETBANKING'
                        ? 'border-[#E86A5B] bg-[#E86A5B]/10 text-[#E86A5B] font-bold'
                        : 'border-[#E2DDD5] text-[#6B6B6B]'
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <span className="text-[11px]">NetBanking</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B] bg-[#F3F1EC] p-3 rounded-xl">
                <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>256-bit Bank Grade Encryption. Funds deposited directly into Merchant Account.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlanToCheckout(null);
                    setCheckoutOrder(null);
                  }}
                  className="neu-btn-secondary py-2.5 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingPayment}
                  onClick={handleCompletePayment}
                  className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 font-bold shadow-lg shadow-primary-500/25"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{processingPayment ? 'Verifying with Bank...' : `Pay ₹${checkoutOrder.amount_inr.toLocaleString('en-IN')}`}</span>
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
