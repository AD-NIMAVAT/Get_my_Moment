'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, LeadItem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { NeomorphicSelect } from '@/components/NeomorphicSelect';
import { 
  Users, Plus, ArrowRight, CheckCircle2, Phone, Mail, MapPin, 
  IndianRupee, Calendar, MessageSquare, Sparkles, Filter, ChevronRight, Check, ArrowLeft
} from 'lucide-react';

const STAGES = [
  { id: 'ALL', label: 'All Leads' },
  { id: 'NEW_LEAD', label: 'New Inquiries', color: 'text-amber-700 border-amber-300 bg-amber-50' },
  { id: 'QUOTE_SENT', label: 'Quote Sent', color: 'text-blue-700 border-blue-300 bg-blue-50' },
  { id: 'NEGOTIATION', label: 'Follow Up', color: 'text-purple-700 border-purple-300 bg-purple-50' },
  { id: 'BOOKED', label: 'Booked / Confirmed', color: 'text-[#3FA66B] border-emerald-300 bg-emerald-50' },
  { id: 'LOST', label: 'Lost', color: 'text-rose-700 border-rose-300 bg-rose-50' },
];

export default function LeadsCrmPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string>('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<LeadItem | null>(null);
  const [converting, setConverting] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventType, setEventType] = useState('Wedding');
  const [eventDate, setEventDate] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [budgetInr, setBudgetInr] = useState('150000');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      loadLeads();
    }
  }, [user, authLoading, router]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await api.getLeads();
      setLeads(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientPhone.trim()) return;

    setCreating(true);
    try {
      const created = await api.createLead({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim() || undefined,
        event_type: eventType,
        event_date: eventDate || undefined,
        venue_city: venueCity.trim() || undefined,
        estimated_budget_inr: parseFloat(budgetInr) || 0,
        notes: notes.trim() || undefined,
      });

      setLeads([created, ...leads]);
      setShowCreateModal(false);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setEventDate('');
      setVenueCity('');
      setNotes('');
      toast.success(`Inquiry for "${created.client_name}" created!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    } finally {
      setCreating(false);
    }
  };

  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      const updated = await api.updateLead(leadId, { stage: newStage as any });
      setLeads(leads.map((l) => (l.id === leadId ? updated : l)));
      toast.success(`Stage updated to ${newStage}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stage');
    }
  };

  const handleConfirmConvert = async () => {
    if (!leadToConvert) return;

    setConverting(true);
    try {
      const res = await api.convertLeadToEvent(leadToConvert.id);
      toast.success(`🎉 Lead converted to Event Workspace!`);
      setLeadToConvert(null);
      router.push(`/dashboard/events/${res.event_id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead');
      setConverting(false);
    }
  };

  const sendWhatsAppQuote = (lead: LeadItem) => {
    const cleanPhone = lead.client_phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const quoteUrl = `${window.location.origin}/quote/${lead.id}`;
    
    const message = encodeURIComponent(
      `Hello ${lead.client_name}! ✨\n\nThank you for reaching out to ${user?.studio_name || 'our studio'} for your ${lead.event_type}.\n\nWe have prepared your customized quotation proposal:\n${quoteUrl}\n\nPlease review our deliverables and packages. Let us know if you'd like to reserve the date!\n\nBest regards,\n${user?.studio_name || 'Studio Team'}`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    toast.info(`Opening WhatsApp for ${lead.client_name}...`);
  };

  const filteredLeads = activeStage === 'ALL' 
    ? leads 
    : leads.filter((l) => l.stage === activeStage);

  const totalPipelineValue = leads
    .filter((l) => l.stage !== 'LOST')
    .reduce((sum, l) => sum + (l.estimated_budget_inr || 0), 0);

  const bookedValue = leads
    .filter((l) => l.stage === 'BOOKED')
    .reduce((sum, l) => sum + (l.estimated_budget_inr || 0), 0);

  if (authLoading || (loading && leads.length === 0)) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="h-32 rounded-3xl skeleton-shimmer" />
            <div className="h-32 rounded-3xl skeleton-shimmer" />
            <div className="h-32 rounded-3xl skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 rounded-3xl skeleton-shimmer" />
            <div className="h-64 rounded-3xl skeleton-shimmer" />
            <div className="h-64 rounded-3xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E8E5E2]">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="text-xs text-[#6B6B6B] hover:text-[#E86A5B] inline-flex items-center gap-1.5 transition-colors font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Studio Hub</span>
            </Link>
            <span className="text-neutral-300">•</span>
            <span className="text-xs font-bold text-[#E86A5B]">Studio OS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#1F1F1F] mt-1">
            Client Inquiries & CRM Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 font-normal">
            Track inquiries, generate 1-click WhatsApp quotes, and convert leads into active event workspaces.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary py-2.5 px-4 text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Inquiry</span>
          </button>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 my-8">
        <div className="neu-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Total Inquiries</span>
            <Users className="w-4 h-4 text-[#E86A5B]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1F1F] mt-2">{leads.length}</div>
          <div className="text-xs text-[#6B6B6B] mt-1">Active client pipeline</div>
        </div>

        <div className="neu-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Pipeline Potential</span>
            <IndianRupee className="w-4 h-4 text-[#D9A441]" />
          </div>
          <div className="text-3xl font-extrabold text-[#D9A441] mt-2">
            ₹{totalPipelineValue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1">Total prospective budget</div>
        </div>

        <div className="neu-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Confirmed Bookings</span>
            <CheckCircle2 className="w-4 h-4 text-[#3FA66B]" />
          </div>
          <div className="text-3xl font-extrabold text-[#3FA66B] mt-2">
            ₹{bookedValue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1">Won wedding contracts</div>
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-[#EBE8E1] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF] mb-6 no-scrollbar">
        {STAGES.map((s) => {
          const count = s.id === 'ALL' ? leads.length : leads.filter((l) => l.stage === s.id).length;
          const isActive = activeStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(s.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-[#F3F1EC] text-[#E86A5B] shadow-[3px_3px_6px_#D4D0C7,-3px_-3px_6px_#FFFFFF]'
                  : 'text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              <span>{s.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-[#E86A5B]/15 text-[#E86A5B]' : 'bg-[#D4D0C7]/40 text-[#6B6B6B]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white border border-dashed border-[#E8E5E2] shadow-sm">
          <Users className="w-12 h-12 text-[#E86A5B]/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#1F1F1F]">No inquiries in this category</h3>
          <p className="text-xs text-[#6B6B6B] mt-1">Click "Add New Inquiry" to log wedding leads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="neu-card p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill ${
                    STAGES.find((s) => s.id === lead.stage)?.color || 'text-slate-400'
                  }`}>
                    {STAGES.find((s) => s.id === lead.stage)?.label || lead.stage}
                  </span>
                  <span className="text-xs font-extrabold text-[#1F1F1F]">
                    ₹{(lead.estimated_budget_inr || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <h3 className="text-lg font-display font-extrabold text-[#1F1F1F] mb-1">
                  {lead.client_name}
                </h3>
                <span className="text-xs text-[#E86A5B] font-bold block mb-3">{lead.event_type}</span>

                <div className="space-y-1.5 text-xs text-[#6B6B6B] mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#8E8E8E]" />
                    <span>{lead.client_phone}</span>
                  </div>
                  {lead.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#8E8E8E]" />
                      <span>{new Date(lead.event_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  {lead.venue_city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#8E8E8E]" />
                      <span>{lead.venue_city}</span>
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <p className="text-xs text-[#6B6B6B] bg-[#EBE8E1] p-2.5 rounded-xl shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] line-clamp-2 mb-4">
                    {lead.notes}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#E2DDD5] space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => sendWhatsAppQuote(lead)}
                    className="neu-btn-secondary flex-1 py-2 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer text-[#3FA66B]"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#3FA66B]" />
                    <span>WhatsApp Quote</span>
                  </button>

                  <select
                    value={lead.stage}
                    onChange={(e) => handleStageChange(lead.id, e.target.value)}
                    className="gmm-input py-2 px-2.5 text-xs text-[#1F1F1F] font-bold outline-none cursor-pointer"
                  >
                    <option value="NEW_LEAD">New</option>
                    <option value="QUOTE_SENT">Quote Sent</option>
                    <option value="NEGOTIATION">Follow Up</option>
                    <option value="BOOKED">Booked</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>

                {lead.stage === 'BOOKED' && !lead.converted_event_id && (
                  <button
                    onClick={() => setLeadToConvert(lead)}
                    className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Convert to Event Workspace →</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD LEAD MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Client Inquiry"
        subtitle="Log client details to track stages and generate WhatsApp quotations."
        icon={<Users className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Client Full Name *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Rahul & Priya"
              className="gmm-input w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Phone / WhatsApp *</label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="gmm-input w-full"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Budget (₹ INR)</label>
              <input
                type="number"
                value={budgetInr}
                onChange={(e) => setBudgetInr(e.target.value)}
                placeholder="150000"
                className="gmm-input w-full font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Event Type</label>
              <NeomorphicSelect
                value={eventType}
                onChange={setEventType}
                options={[
                  { value: 'Wedding', label: 'Wedding' },
                  { value: 'Pre-Wedding', label: 'Pre-Wedding' },
                  { value: 'Engagement', label: 'Engagement' },
                  { value: 'Reception', label: 'Reception' },
                  { value: 'Baby Shower', label: 'Baby Shower' },
                ]}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Event Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="gmm-input font-mono w-full"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Venue / City</label>
            <input
              type="text"
              value={venueCity}
              onChange={(e) => setVenueCity(e.target.value)}
              placeholder="e.g. Udaipur / Surat"
              className="gmm-input w-full"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Notes / Inclusions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 2 Photographers + 1 Drone operator required"
              className="gmm-input w-full resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#E8E5E2]">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-[#E8E5E2] hover:bg-[#EBE8E1] text-[#6B6B6B] text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 btn-primary py-2.5 text-xs font-bold"
            >
              {creating ? 'Saving...' : 'Create Inquiry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONVERT LEAD CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!leadToConvert}
        onClose={() => setLeadToConvert(null)}
        onConfirm={handleConfirmConvert}
        title="Convert to Event Workspace?"
        message={`Convert "${leadToConvert?.client_name}" into an active wedding event workspace? This will initialize photo uploads, AI facial search, and client deliverables.`}
        confirmText="Convert & Open Workspace"
        isDanger={false}
        loading={converting}
      />
    </div>
  );
}
