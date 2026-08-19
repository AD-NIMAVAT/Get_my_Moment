'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Receipt, CheckCircle2, Printer, QrCode, Building2, Phone, Camera } from 'lucide-react';

export default function PublicSharedInvoicePage() {
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedInvoice();
    }
  }, [token]);

  const loadSharedInvoice = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicSharedInvoice(token);
      setInvoice(data);
    } catch (e: any) {
      setError(e.message || 'Invoice not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const url = api.getPublicSharedInvoiceHtmlUrl(token);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F1EC]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E86A5B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-[#6B6B6B]">Loading your official invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F1EC] p-4">
        <div className="neu-card p-8 max-w-md text-center">
          <Receipt className="w-12 h-12 text-[#6B6B6B] mx-auto mb-3 opacity-40" />
          <h2 className="text-lg font-bold text-[#1F1F1F]">Invoice Link Unavailable</h2>
          <p className="text-xs text-[#6B6B6B] mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F1EC] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Header Card */}
        <div className="flex items-center justify-between neu-card p-4">
          <div className="flex items-center gap-3">
            {invoice.studio_logo_url ? (
              <img
                src={`${api.getApiBaseUrl().replace('/api/v1', '')}${invoice.studio_logo_url}`}
                alt={invoice.studio_name}
                className="max-h-11 max-w-[140px] object-contain rounded-xl drop-shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EE7E6F] via-[#E86A5B] to-[#C94F43] flex items-center justify-center text-white font-bold shadow-md">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="text-[10px] text-[#6B6B6B] font-bold uppercase tracking-wider">Official Invoice</div>
              <div className="text-sm font-extrabold text-[#E86A5B] font-mono">{invoice.invoice_number}</div>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="neu-card p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E2DDD5] pb-5 flex justify-between items-start">
            <div className="flex items-start gap-3.5">
              {invoice.studio_logo_url && (
                <img
                  src={`${api.getApiBaseUrl().replace('/api/v1', '')}${invoice.studio_logo_url}`}
                  alt={invoice.studio_name}
                  className="max-h-12 max-w-[120px] object-contain rounded-lg drop-shadow-sm hidden sm:block"
                />
              )}
              <div>
                <h2 className="text-xl font-extrabold text-[#1F1F1F]">{invoice.studio_name}</h2>
                <p className="text-xs text-[#6B6B6B] mt-0.5">Professional Photography & Cinema</p>
                {invoice.studio_phone && (
                  <p className="text-xs text-[#1F1F1F] mt-1 flex items-center gap-1 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-[#E86A5B]" />
                    {invoice.studio_phone}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold neu-pill ${
                invoice.status === 'PAID'
                  ? 'bg-emerald-50 text-[#3FA66B] border border-emerald-200'
                  : invoice.status === 'PARTIALLY_PAID'
                  ? 'bg-amber-50 text-[#D9A441] border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Client & Event Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] space-y-1">
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Billed To</span>
              <p className="font-extrabold text-[#1F1F1F] text-sm">{invoice.client_name}</p>
              {invoice.event_name && <p className="text-[#6B6B6B] font-medium">{invoice.event_name}</p>}
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FAF9F7] border border-[#E2DDD5] space-y-1 text-right">
              <span className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider block">Invoice Date</span>
              <p className="font-extrabold text-[#1F1F1F]">{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</p>
              {invoice.due_date && <p className="text-[#6B6B6B]">Due: {new Date(invoice.due_date).toLocaleDateString('en-IN')}</p>}
            </div>
          </div>

          {/* Itemized Services */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">Services & Deliverables</h3>
            <div className="rounded-2xl border border-[#E2DDD5] overflow-hidden divide-y divide-[#E2DDD5] text-xs">
              {invoice.items.map((it: any, idx: number) => (
                <div key={idx} className="p-3.5 flex justify-between items-center bg-white/60">
                  <div>
                    <span className="font-bold text-[#1F1F1F]">{it.description}</span>
                    <span className="text-[#6B6B6B] text-[11px] block">Qty: {it.quantity}</span>
                  </div>
                  <span className="font-extrabold text-[#1F1F1F]">₹{it.line_total_inr.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="p-5 rounded-2xl bg-[#EBE8E1]/80 border border-white/60 space-y-2 text-xs">
            <div className="flex justify-between text-[#6B6B6B] font-medium">
              <span>Total Invoice Amount:</span>
              <span className="font-bold text-[#1F1F1F]">₹{invoice.grand_total_inr.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[#3FA66B] font-bold">
              <span>Amount Paid:</span>
              <span>₹{invoice.amount_paid_inr.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E2DDD5] text-sm font-black">
              <span className={invoice.balance_due_inr > 0 ? 'text-rose-600' : 'text-[#3FA66B]'}>Balance Due:</span>
              <span className={invoice.balance_due_inr > 0 ? 'text-rose-600' : 'text-[#3FA66B]'}>₹{invoice.balance_due_inr.toLocaleString()}</span>
            </div>
          </div>

          {/* Authorized Signatory / Digital Stamp */}
          {(invoice.signature_url || invoice.digital_stamp_url) && (
            <div className="flex justify-end pt-2">
              <div className="text-center p-3 rounded-2xl bg-white/80 border border-[#E2DDD5] max-w-[200px]">
                <img
                  src={`${api.getApiBaseUrl().replace('/api/v1', '')}${invoice.signature_url || invoice.digital_stamp_url}`}
                  alt="Authorized Signatory"
                  className="max-h-16 max-w-[160px] mx-auto object-contain drop-shadow"
                />
                <div className="border-t border-[#D4D0C7] mt-2 pt-1">
                  <p className="text-[10px] font-bold text-[#1F1F1F]">{invoice.studio_name}</p>
                  <p className="text-[9px] font-mono text-[#6B6B6B] uppercase tracking-wider">Authorized Signatory</p>
                </div>
              </div>
            </div>
          )}

          {/* Direct UPI Scan to Pay if balance remaining */}
          {invoice.balance_due_inr > 0 && invoice.studio_upi_id && (
            <div className="text-center p-6 rounded-2xl bg-[#FFFBF0] border border-amber-200/80 space-y-3">
              <h4 className="text-xs font-bold text-[#1F1F1F] flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-[#E86A5B]" />
                Scan to Settle Balance via UPI
              </h4>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${invoice.studio_upi_id}&pn=${encodeURIComponent(invoice.studio_name)}&am=${invoice.balance_due_inr}&cu=INR`)}`}
                alt="Scan to Pay UPI"
                className="w-36 h-36 mx-auto rounded-2xl border border-[#E2DDD5] shadow-md bg-white p-2"
              />
              <div className="font-mono text-xs font-bold text-[#1F1F1F]">{invoice.studio_upi_id}</div>
              <p className="text-[11px] text-[#6B6B6B]">Scan using Google Pay, PhonePe, Paytm, or any UPI app.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
