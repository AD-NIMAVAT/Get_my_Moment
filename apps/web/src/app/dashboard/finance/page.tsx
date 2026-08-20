'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { 
  Receipt, 
  FileText, 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Share2, 
  Printer, 
  Download, 
  Building2, 
  ArrowRight,
  Search,
  AlertCircle,
  CreditCard,
  X,
  IndianRupee,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'invoices' | 'quotations' | 'tax_profile' | 'ca_export'>('invoices');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [taxProfile, setTaxProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // New Invoice Form State
  const [newInvoice, setNewInvoice] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    client_city: '',
    client_state: 'Gujarat',
    client_gstin: '',
    event_name: '',
    event_date: '',
    event_venue: '',
    tax_mode: 'WITH_GST',
    discount_inr: 0,
    advance_paid_inr: 0,
    advance_payment_mode: 'UPI',
    advance_reference_no: '',
    notes: '',
    items: [
      { service_type: 'PHOTOGRAPHY', description: 'Wedding Photography & Candid Coverage', quantity: 1, unit_price_inr: 50000, discount_value: 0, discount_type: 'FIXED' }
    ]
  });

  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount_inr: '',
    payment_mode: 'UPI',
    reference_no: '',
    notes: ''
  });

  // Tax Profile Form State
  const [taxForm, setTaxForm] = useState({
    gst_status: 'UNREGISTERED',
    gst_legal_name: '',
    gstin: '',
    gst_state: 'Gujarat',
    default_tax_mode: 'WITHOUT_GST',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    upi_id: '',
    gst_address: '',
  });

  // CA Export Filter State
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [savingTax, setSavingTax] = useState(false);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadAllData();
    }
  }, [user, authLoading, router]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [statsData, invData, quoteData, taxData] = await Promise.all([
        api.getFinanceStats().catch(() => null),
        api.getClientInvoices().catch(() => []),
        api.getQuotations().catch(() => []),
        api.getTaxProfile().catch(() => null),
      ]);

      setStats(statsData);
      setInvoices(invData || []);
      setQuotations(quoteData || []);
      if (taxData) {
        setTaxProfile(taxData);
        setTaxForm({
          gst_status: taxData.gst_status || 'UNREGISTERED',
          gst_legal_name: taxData.gst_legal_name || '',
          gstin: taxData.gstin || '',
          gst_state: taxData.gst_state || 'Gujarat',
          default_tax_mode: taxData.default_tax_mode || 'WITHOUT_GST',
          bank_name: taxData.bank_name || '',
          bank_account_number: taxData.bank_account_number || '',
          bank_ifsc: taxData.bank_ifsc || '',
          upi_id: taxData.upi_id || '',
          gst_address: taxData.gst_address || '',
        });
      }
    } catch (e: any) {
      console.error('Error loading finance data:', e);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTaxProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTax(true);
    try {
      await api.updateTaxProfile(taxForm);
      toast.success('Business & Tax Profile updated successfully!');
      loadAllData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update tax profile');
    } finally {
      setSavingTax(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingInvoice(true);
    try {
      await api.createClientInvoice(newInvoice);
      toast.success('Client Invoice created successfully!');
      setShowCreateInvoiceModal(false);
      loadAllData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setRecordingPayment(true);
    try {
      await api.recordClientPayment(selectedInvoice.id, {
        amount_inr: parseFloat(paymentForm.amount_inr),
        payment_mode: paymentForm.payment_mode,
        reference_no: paymentForm.reference_no,
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      loadAllData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleConvertQuotation = async (quotationId: string) => {
    if (!confirm('Are you sure you want to convert this quotation into an official Client Invoice?')) return;
    try {
      const res = await api.convertQuotationToInvoice(quotationId);
      toast.success(res.message || 'Quotation converted to Invoice!');
      loadAllData();
      setActiveTab('invoices');
    } catch (e: any) {
      toast.error(e.message || 'Failed to convert quotation');
    }
  };

  const handleShareWhatsApp = (inv: any) => {
    const shareUrl = `${window.location.origin}/i/${inv.secure_share_token}`;
    const text = `Hello ${inv.client_name}! 📸\n\nHere is your official invoice *${inv.invoice_number}* for ${inv.event_name || 'Photography Services'}:\n💰 Total Amount: ₹${inv.grand_total_inr.toLocaleString()}\n✅ Amount Paid: ₹${inv.amount_paid_inr.toLocaleString()}\n⏳ Balance Due: ₹${inv.balance_due_inr.toLocaleString()}\n\n🔗 View & Download PDF Invoice: ${shareUrl}`;
    const cleanPhone = (inv.client_phone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintPdf = (invId: string) => {
    const url = api.getClientInvoiceHtmlUrl(invId, true);
    window.open(url, '_blank');
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (inv.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (inv.event_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E2DDD5]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
              Finance & Invoicing OS
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E86A5B]/15 text-[#E86A5B] border border-[#E86A5B]/30 neu-pill">
              GST & BILLING
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 font-normal">
            Complete Client Billing, GST Tax Invoices, Quotations, Advances & CA Reports
          </p>
        </div>

        <button
          onClick={() => setShowCreateInvoiceModal(true)}
          className="btn-primary self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Client Invoice</span>
        </button>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 my-6 sm:my-8">
        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Total Billed</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#E86A5B]">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F1F1F] mt-2 sm:mt-3">
            ₹{(stats?.total_billed_inr || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">
            Across {stats?.active_invoices_count || 0} client invoices
          </div>
        </div>

        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Collected</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#3FA66B]">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#3FA66B] mt-2 sm:mt-3">
            ₹{(stats?.total_collected_inr || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">
            Advance tokens & milestones
          </div>
        </div>

        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Balance Due</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-rose-500">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-2 sm:mt-3">
            ₹{(stats?.total_balance_due_inr || 0).toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">
            Due on delivery & shoot
          </div>
        </div>

        <div className="neu-card p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Quotations</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] flex items-center justify-center text-[#D9A441]">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#D9A441] mt-2 sm:mt-3">
            {stats?.active_quotations_count || 0}
          </div>
          <div className="text-[10px] sm:text-xs text-[#6B6B6B] mt-0.5 sm:mt-1">
            Active inquiries
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
              : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Client Invoices ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'quotations'
              ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
              : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Quotations ({quotations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('tax_profile')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'tax_profile'
              ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
              : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Tax & Bank Details</span>
        </button>
        <button
          onClick={() => setActiveTab('ca_export')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ca_export'
              ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
              : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>CA / GSTR-1 CSV</span>
        </button>
      </div>

      {/* TAB 1: CLIENT INVOICES */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="neu-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search client, invoice #, event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="neu-inset w-full pl-10 pr-4 py-2 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto p-1 bg-[#EBE8E1] rounded-xl shadow-[inset_1px_1px_3px_#D1CDC4]">
              {['ALL', 'ISSUED', 'PARTIALLY_PAID', 'PAID'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-[#F3F1EC] text-[#1F1F1F] shadow-[2px_2px_4px_#D4D0C7]'
                      : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices List */}
          {filteredInvoices.length === 0 ? (
            <div className="neu-card p-12 text-center">
              <FileText className="w-12 h-12 text-[#6B6B6B] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-[#1F1F1F]">No Client Invoices Found</h3>
              <p className="text-xs text-[#6B6B6B] mt-1 max-w-sm mx-auto">
                Click "Create Client Invoice" to generate an official GST or Non-GST tax invoice for your clients.
              </p>
            </div>
          ) : (
            <div className="neu-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EBE8E1]/60 border-b border-[#E2DDD5] text-[#6B6B6B] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Client & Event</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-right">Total (₹)</th>
                      <th className="px-5 py-3.5 text-right">Paid (₹)</th>
                      <th className="px-5 py-3.5 text-right">Balance (₹)</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD5]/60">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-[#E86A5B]">
                          {inv.invoice_number}
                          <div className="text-[10px] text-[#6B6B6B] font-sans font-normal">{inv.document_type}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-[#1F1F1F]">{inv.client_name}</div>
                          <div className="text-[#6B6B6B] text-[11px]">{inv.event_name || 'Photography Shoot'}</div>
                        </td>
                        <td className="px-5 py-4 text-[#6B6B6B]">
                          {new Date(inv.invoice_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[#1F1F1F]">
                          ₹{inv.grand_total_inr.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[#3FA66B]">
                          ₹{inv.amount_paid_inr.toLocaleString()}
                        </td>
                        <td className={`px-5 py-4 text-right font-black ${inv.balance_due_inr > 0 ? 'text-rose-600' : 'text-[#3FA66B]'}`}>
                          ₹{inv.balance_due_inr.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase neu-pill ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-[#3FA66B] border border-emerald-200'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-50 text-[#D9A441] border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {inv.balance_due_inr > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setPaymentForm({ ...paymentForm, amount_inr: inv.balance_due_inr.toString() });
                                  setShowPaymentModal(true);
                                }}
                                title="Record Payment"
                                className="p-2 rounded-xl neu-icon-btn text-[#3FA66B] hover:scale-105 transition-all"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleShareWhatsApp(inv)}
                              title="Share on WhatsApp"
                              className="p-2 rounded-xl neu-icon-btn text-[#3FA66B] hover:scale-105 transition-all"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintPdf(inv.id)}
                              title="Print / Download PDF"
                              className="p-2 rounded-xl neu-icon-btn text-[#1F1F1F] hover:scale-105 transition-all"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center neu-card p-4">
            <div className="text-sm font-bold text-[#1F1F1F]">
              Active Quotations & Estimates
            </div>
            <button
              onClick={() => setShowCreateInvoiceModal(true)}
              className="btn-primary py-2 px-3.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              New Estimate
            </button>
          </div>

          {quotations.length === 0 ? (
            <div className="neu-card p-12 text-center">
              <FileText className="w-12 h-12 text-[#6B6B6B] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-[#1F1F1F]">No Quotations Created</h3>
              <p className="text-xs text-[#6B6B6B] mt-1">Create quotations for client inquiries and convert them to invoices with 1-click.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotations.map(q => (
                <div key={q.id} className="neu-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#E86A5B] bg-[#E86A5B]/10 px-2 py-0.5 rounded-lg border border-[#E86A5B]/20">
                      {q.quotation_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill ${
                      q.status === 'CONVERTED' ? 'bg-emerald-50 text-[#3FA66B] border border-emerald-200' : 'bg-amber-50 text-[#D9A441] border border-amber-200'
                    }`}>
                      {q.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-[#1F1F1F] text-base">{q.client_name}</h4>
                    <p className="text-xs text-[#6B6B6B]">{q.package_name} • {q.event_type}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E2DDD5]/60 text-xs">
                    <div>
                      <div className="text-[#6B6B6B] text-[11px]">Total Estimate:</div>
                      <div className="font-extrabold text-[#1F1F1F] text-base">₹{q.total_amount_inr?.toLocaleString()}</div>
                    </div>

                    {q.status !== 'CONVERTED' && (
                      <button
                        onClick={() => handleConvertQuotation(q.id)}
                        className="btn-primary py-2 px-3 text-xs font-bold shadow-sm"
                      >
                        <span>Convert to Invoice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TAX & STUDIO BANKING PROFILE */}
      {activeTab === 'tax_profile' && (
        <div className="neu-card p-6 sm:p-8 max-w-3xl">
          <h3 className="text-lg font-bold text-[#1F1F1F] flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-[#E86A5B]" />
            Studio Business & Tax Profile
          </h3>
          <p className="text-xs text-[#6B6B6B] mb-6">
            Configure your GST registration, legal trade name, and bank details. These will automatically print on your client invoices and generate direct UPI QR codes.
          </p>

          <form onSubmit={handleSaveTaxProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">GST Registration Status</label>
                <select
                  value={taxForm.gst_status}
                  onChange={(e) => setTaxForm({ ...taxForm, gst_status: e.target.value })}
                  className="neu-inset w-full text-xs font-semibold"
                >
                  <option value="UNREGISTERED">UNREGISTERED (Commercial Invoice / No GST)</option>
                  <option value="REGISTERED">REGISTERED (Regular GSTIN / Tax Invoice)</option>
                  <option value="COMPOSITION">COMPOSITION (Bill of Supply)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Default Tax Mode</label>
                <select
                  value={taxForm.default_tax_mode}
                  onChange={(e) => setTaxForm({ ...taxForm, default_tax_mode: e.target.value })}
                  disabled={taxForm.gst_status === 'UNREGISTERED'}
                  className="neu-inset w-full text-xs font-semibold disabled:opacity-50"
                >
                  <option value="WITHOUT_GST">WITHOUT_GST (Non-Taxable Bill)</option>
                  <option value="WITH_GST">WITH_GST (Charge 18% CGST/SGST or IGST)</option>
                </select>
              </div>
            </div>

            {taxForm.gst_status === 'REGISTERED' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FFFBF0] border border-amber-200/60">
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">15-Digit GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 24ABCDE1234F1Z5"
                    value={taxForm.gstin}
                    onChange={(e) => setTaxForm({ ...taxForm, gstin: e.target.value.toUpperCase() })}
                    className="neu-inset w-full text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">GST Legal Trade Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aura Cinematic Studio LLP"
                    value={taxForm.gst_legal_name}
                    onChange={(e) => setTaxForm({ ...taxForm, gst_legal_name: e.target.value })}
                    className="neu-inset w-full text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Studio / Registered Address</label>
              <textarea
                rows={2}
                placeholder="Street, City, Pincode, State"
                value={taxForm.gst_address}
                onChange={(e) => setTaxForm({ ...taxForm, gst_address: e.target.value })}
                className="neu-inset w-full text-xs"
              />
            </div>

            <div className="pt-4 border-t border-[#E2DDD5]">
              <h4 className="text-sm font-bold text-[#1F1F1F] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#3FA66B]" />
                Studio Direct Client Bank & UPI Settlement
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Direct Business UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. yourstudio@okhdfcbank"
                    value={taxForm.upi_id}
                    onChange={(e) => setTaxForm({ ...taxForm, upi_id: e.target.value })}
                    className="neu-inset w-full text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-[#6B6B6B] mt-1">Generates an instant Scan-to-Pay QR code on your client invoice PDF.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank / ICICI Bank"
                    value={taxForm.bank_name}
                    onChange={(e) => setTaxForm({ ...taxForm, bank_name: e.target.value })}
                    className="neu-inset w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50200012345678"
                    value={taxForm.bank_account_number}
                    onChange={(e) => setTaxForm({ ...taxForm, bank_account_number: e.target.value })}
                    className="neu-inset w-full text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F1F1F] mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={taxForm.bank_ifsc}
                    onChange={(e) => setTaxForm({ ...taxForm, bank_ifsc: e.target.value.toUpperCase() })}
                    className="neu-inset w-full text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={savingTax}
                className="btn-primary py-2.5 px-6 text-xs font-bold"
              >
                {savingTax ? 'Saving Profile...' : 'Save Business & Tax Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: CA / GSTR-1 EXPORT */}
      {activeTab === 'ca_export' && (
        <div className="neu-card p-6 sm:p-8 max-w-2xl">
          <h3 className="text-lg font-bold text-[#1F1F1F] flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-[#E86A5B]" />
            CA / Accounting & GSTR-1 Export
          </h3>
          <p className="text-xs text-[#6B6B6B] mb-6">
            Export all finalized client invoices with taxable values, CGST, SGST, IGST breakdown, client GSTIN, and place of supply for monthly/quarterly GST returns.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">From Date</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="neu-inset w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1">To Date</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="neu-inset w-full text-xs"
                />
              </div>
            </div>

            <div className="pt-4">
              <a
                href={api.getGstr1ExportUrl(exportStartDate, exportEndDate)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary py-3 px-6 text-xs font-bold inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download GSTR-1 Ready CSV</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateInvoiceModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateInvoiceModal(false)}
          title="Create Client Invoice"
          subtitle="Generate an official GST Tax Invoice, Commercial Bill, or Quotation for your client."
          size="lg"
          icon={<Plus className="w-5 h-5 text-[#E86A5B]" />}
        >
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul & Sneha"
                  value={newInvoice.client_name}
                  onChange={(e) => setNewInvoice({ ...newInvoice, client_name: e.target.value })}
                  className="neu-inset w-full text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Client Phone (WhatsApp) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={newInvoice.client_phone}
                  onChange={(e) => setNewInvoice({ ...newInvoice, client_phone: e.target.value })}
                  className="neu-inset w-full text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grand Wedding Celebration"
                  value={newInvoice.event_name}
                  onChange={(e) => setNewInvoice({ ...newInvoice, event_name: e.target.value })}
                  className="neu-inset w-full text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Event Venue / City</label>
                <input
                  type="text"
                  placeholder="e.g. Ahmedabad, Gujarat"
                  value={newInvoice.client_city}
                  onChange={(e) => setNewInvoice({ ...newInvoice, client_city: e.target.value })}
                  className="neu-inset w-full text-xs"
                />
              </div>
            </div>

            {/* Items builder */}
            <div className="space-y-3 pt-3 border-t border-[#E2DDD5]">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1F1F1F]">Service Line Items</span>
                <button
                  type="button"
                  onClick={() => setNewInvoice({
                    ...newInvoice,
                    items: [...newInvoice.items, { service_type: 'VIDEOGRAPHY', description: 'Cinematic Wedding Film', quantity: 1, unit_price_inr: 40000, discount_value: 0, discount_type: 'FIXED' }]
                  })}
                  className="text-xs font-bold text-[#E86A5B] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {newInvoice.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 bg-[#EBE8E1] rounded-2xl border border-white/60 items-center">
                  <div className="col-span-1 sm:col-span-6 min-w-0">
                    <input
                      type="text"
                      placeholder="Service Description"
                      value={it.description}
                      onChange={(e) => {
                        const copy = [...newInvoice.items];
                        copy[idx].description = e.target.value;
                        setNewInvoice({ ...newInvoice, items: copy });
                      }}
                      className="neu-inset w-full text-xs py-2"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2 min-w-0">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => {
                        const copy = [...newInvoice.items];
                        copy[idx].quantity = parseFloat(e.target.value) || 1;
                        setNewInvoice({ ...newInvoice, items: copy });
                      }}
                      className="neu-inset w-full text-xs py-2 text-center"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-3 min-w-0">
                    <input
                      type="number"
                      placeholder="Rate (₹)"
                      value={it.unit_price_inr}
                      onChange={(e) => {
                        const copy = [...newInvoice.items];
                        copy[idx].unit_price_inr = parseFloat(e.target.value) || 0;
                        setNewInvoice({ ...newInvoice, items: copy });
                      }}
                      className="neu-inset w-full text-xs py-2 text-right font-bold"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-1 text-center">
                    {newInvoice.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = newInvoice.items.filter((_, i) => i !== idx);
                          setNewInvoice({ ...newInvoice, items: copy });
                        }}
                        className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                        title="Remove line item"
                      >
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tax Mode & Advance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2DDD5]">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Tax Mode</label>
                <select
                  value={newInvoice.tax_mode}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax_mode: e.target.value })}
                  className="neu-inset w-full text-xs font-semibold"
                >
                  <option value="WITH_GST">WITH GST (18% Intra/Inter-state)</option>
                  <option value="WITHOUT_GST">WITHOUT GST (Commercial / Exempt)</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Advance Token Collected (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 20000"
                  value={newInvoice.advance_paid_inr || ''}
                  onChange={(e) => setNewInvoice({ ...newInvoice, advance_paid_inr: parseFloat(e.target.value) || 0 })}
                  className="neu-inset w-full text-xs font-bold text-[#3FA66B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DDD5]">
              <button
                type="button"
                onClick={() => setShowCreateInvoiceModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-[#6B6B6B] neu-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingInvoice}
                className="btn-primary py-2.5 px-6 text-xs font-bold"
              >
                {submittingInvoice ? 'Generating Invoice...' : 'Issue Client Invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setShowPaymentModal(false)}
          title="Record Client Payment"
          subtitle={`Invoice: ${selectedInvoice.invoice_number} (${selectedInvoice.client_name})`}
          size="md"
          icon={<CreditCard className="w-5 h-5 text-[#3FA66B]" />}
        >
          <div className="p-3.5 rounded-2xl bg-[#EBE8E1] flex justify-between items-center text-xs shadow-[inset_2px_2px_4px_#D1CDC4] mb-4">
            <span className="text-[#6B6B6B] font-medium">Remaining Balance:</span>
            <span className="font-extrabold text-rose-600 text-sm">₹{selectedInvoice.balance_due_inr.toLocaleString()}</span>
          </div>

          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Payment Amount (₹) *</label>
              <input
                type="number"
                required
                max={selectedInvoice.balance_due_inr}
                value={paymentForm.amount_inr}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount_inr: e.target.value })}
                className="neu-inset w-full text-xs font-extrabold text-[#1F1F1F]"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Payment Mode</label>
              <select
                value={paymentForm.payment_mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                className="neu-inset w-full text-xs font-bold"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online Card / Gateway</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Reference / UTR Number</label>
              <input
                type="text"
                placeholder="e.g. UPI-UTR-123456"
                value={paymentForm.reference_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                className="neu-inset w-full text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DDD5]">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-[#6B6B6B] neu-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={recordingPayment}
                className="btn-primary py-2.5 px-5 text-xs font-bold"
              >
                {recordingPayment ? 'Recording...' : 'Confirm & Issue Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
