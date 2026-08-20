'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  api, MonthCalendarResponse, DayAvailabilityItem, 
  CalendarNoteItem, CalendarEventSummary, CalendarLeadSummary 
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  CheckCircle2, AlertCircle, Ban, Clock, MapPin, IndianRupee, 
  Sparkles, Trash2, ArrowUpRight, ArrowLeft, Tag, ShieldCheck, 
  HelpCircle, MessageSquare 
} from 'lucide-react';

export default function StudioCalendarPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12

  const [calendarData, setCalendarData] = useState<MonthCalendarResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayAvailabilityItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick date search verifier
  const [checkDateInput, setCheckDateInput] = useState<string>('');
  const [checkResult, setCheckResult] = useState<{ date: string; status: string; text: string } | null>(null);

  // Note Modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteDate, setNoteDate] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteCategory, setNoteCategory] = useState<'NOTE' | 'REMINDER' | 'BLOCKED' | 'LEAVE'>('NOTE');
  const [savingNote, setSavingNote] = useState(false);

  // Delete Note State
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadMonth(currentYear, currentMonth);
    }
  }, [user, currentYear, currentMonth]);

  const loadMonth = async (yr: number, mo: number) => {
    try {
      setLoading(true);
      const data = await api.getMonthCalendar(yr, mo);
      setCalendarData(data);

      const todayStr = new Date().toISOString().split('T')[0];
      const matchToday = data.days.find((d) => d.date_str === todayStr);
      if (matchToday) {
        setSelectedDay(matchToday);
      } else if (data.days.length > 0) {
        setSelectedDay(data.days[0]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load studio calendar');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  const handleVerifyDate = async () => {
    if (!checkDateInput) return;
    try {
      const res = await api.checkDayAvailability(checkDateInput);
      let text = '';
      if (res.availability_status === 'AVAILABLE') {
        text = `✅ ${checkDateInput}: Studio is 100% AVAILABLE. No conflicting shoots.`;
        toast.success(`Date ${checkDateInput} is available for booking!`);
      } else if (res.availability_status === 'BLOCKED') {
        text = `⛔ ${checkDateInput}: Date is BLOCKED (${res.notes.map((n) => n.title).join(', ') || 'Blocked / Personal Leave'}).`;
        toast.warning(`Date ${checkDateInput} is blocked.`);
      } else if (res.availability_status === 'BOOKED') {
        text = `⚠️ ${checkDateInput}: Multiple bookings scheduled (${res.events.map((e) => e.name).join(', ')}).`;
        toast.info(`Date ${checkDateInput} has multiple bookings.`);
      } else {
        text = `📸 ${checkDateInput}: Booked for "${res.events[0]?.name}".`;
        toast.info(`Date ${checkDateInput} is booked for ${res.events[0]?.name}.`);
      }
      setCheckResult({ date: checkDateInput, status: res.availability_status, text });
    } catch (err: any) {
      toast.error(err.message || 'Failed to check date');
    }
  };

  const handleOpenAddNote = (presetDate?: string) => {
    setNoteDate(presetDate || selectedDay?.date_str || new Date().toISOString().split('T')[0]);
    setNoteTitle('');
    setNoteDescription('');
    setNoteCategory('NOTE');
    setShowNoteModal(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDate || !noteTitle.trim()) return;

    setSavingNote(true);
    try {
      await api.createCalendarNote({
        date_str: noteDate,
        title: noteTitle.trim(),
        description: noteDescription.trim() || undefined,
        category: noteCategory,
      });

      setShowNoteModal(false);
      toast.success('Note / blocked date logged to calendar!');
      await loadMonth(currentYear, currentMonth);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save calendar note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteToDeleteId) return;
    setDeletingNote(true);
    try {
      await api.deleteCalendarNote(noteToDeleteId);
      toast.success('Calendar entry removed');
      setNoteToDeleteId(null);
      await loadMonth(currentYear, currentMonth);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete note');
    } finally {
      setDeletingNote(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = calendarData?.days.length
    ? new Date(calendarData.days[0].date_str).getDay()
    : 0;

  if (authLoading || (loading && !calendarData)) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-6">
          <div className="h-28 rounded-3xl skeleton-shimmer" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 rounded-3xl skeleton-shimmer" />
            <div className="h-96 rounded-3xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      {/* Top Header */}
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
            Studio Calendar & Availability Checker
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 font-normal">
            Check open dates in 1 second, manage multi-day wedding shoots, block personal leave, and log studio notes.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleOpenAddNote()}
            className="btn-primary py-2.5 px-4 text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Note / Block Date</span>
          </button>
        </div>
      </div>

      {/* Quick Availability Verifier Bar */}
      <div className="my-6 p-5 rounded-3xl neu-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F3F1EC] shadow-[inset_2px_2px_4px_#D1CDC4,inset_-2px_-2px_4px_#FFFFFF] text-[#E86A5B] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#1F1F1F] block">Instant Availability Verifier</span>
              <span className="text-[11px] text-[#6B6B6B]">Enter an inquiry date to verify if your studio is free or booked.</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={checkDateInput}
              onChange={(e) => setCheckDateInput(e.target.value)}
              className="gmm-input text-xs font-mono"
            />
            <button
              onClick={handleVerifyDate}
              className="btn-primary py-2.5 px-4 text-xs whitespace-nowrap"
            >
              Verify Date
            </button>
          </div>
        </div>

        {checkResult && (
          <div className={`mt-3 p-3.5 rounded-2xl border text-xs font-mono flex items-center justify-between ${
            checkResult.status === 'AVAILABLE'
              ? 'bg-emerald-50 border-emerald-200 text-[#3FA66B]'
              : checkResult.status === 'BLOCKED'
              ? 'bg-amber-50 border-amber-200 text-[#D99A2B]'
              : 'bg-rose-50 border-rose-200 text-rose-600'
          }`}>
            <span className="font-bold">{checkResult.text}</span>
            <button onClick={() => setCheckResult(null)} className="text-[#6B6B6B] hover:text-[#1F1F1F] ml-2 font-bold cursor-pointer">✕</button>
          </div>
        )}
      </div>

      {/* Month Summary Metrics */}
      {calendarData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="neu-card p-5">
            <div className="text-xs text-[#6B6B6B] font-bold uppercase">Booked Days</div>
            <div className="text-2xl font-extrabold text-[#E86A5B] mt-1">
              {calendarData.booked_days_count} <span className="text-xs font-normal text-[#6B6B6B]">Days</span>
            </div>
          </div>
          <div className="neu-card p-5">
            <div className="text-xs text-[#6B6B6B] font-bold uppercase">Open / Available</div>
            <div className="text-2xl font-extrabold text-[#3FA66B] mt-1">
              {calendarData.available_days_count} <span className="text-xs font-normal text-[#6B6B6B]">Days</span>
            </div>
          </div>
          <div className="neu-card p-5">
            <div className="text-xs text-[#6B6B6B] font-bold uppercase">Active Events</div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] mt-1">
              {calendarData.total_events_in_month} <span className="text-xs font-normal text-[#6B6B6B]">Events</span>
            </div>
          </div>
          <div className="neu-card p-5">
            <div className="text-xs text-[#6B6B6B] font-bold uppercase">Contracted Value</div>
            <div className="text-2xl font-extrabold text-[#D9A441] mt-1">
              ₹{calendarData.total_revenue_in_month.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Calendar Grid (Left) + Selected Day Agenda (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Monthly Calendar Grid */}
        <div className="lg:col-span-2 p-6 sm:p-7 rounded-3xl neu-card">
          {/* Month Navigator */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2DDD5]">
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
                {calendarData?.month_name} {currentYear}
              </h2>
              <button
                onClick={handleJumpToToday}
                className="neu-btn-secondary px-3 py-1 text-[11px]"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="neu-icon-btn w-9 h-9 text-[#1F1F1F]"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="neu-icon-btn w-9 h-9 text-[#1F1F1F]"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-[#6B6B6B] font-semibold mb-4 pb-3 border-b border-[#E2DDD5] flex-wrap">
            <span className="flex items-center gap-1.5 neu-pill">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3FA66B]"></span> Available
            </span>
            <span className="flex items-center gap-1.5 neu-pill">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E86A5B]"></span> 1 Event Booked
            </span>
            <span className="flex items-center gap-1.5 neu-pill">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9A441]"></span> Multiple Bookings
            </span>
            <span className="flex items-center gap-1.5 neu-pill">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9534F]"></span> Blocked / Leave
            </span>
          </div>

          {/* 7 Days Column Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mb-2">
            {dayNames.map((d) => (
              <div key={d} className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`blank-${idx}`} className="aspect-square rounded-2xl opacity-20 pointer-events-none" />
            ))}

            {calendarData?.days.map((day) => {
              const isSelected = selectedDay?.date_str === day.date_str;
              const hasEvents = day.events.length > 0;
              const hasNotes = day.notes.length > 0;
              const hasBlocked = day.availability_status === 'BLOCKED';

              return (
                <div
                  key={day.date_str}
                  onClick={() => setSelectedDay(day)}
                  className={`group aspect-square rounded-2xl p-2 flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#EBE8E1] shadow-[inset_3px_3px_6px_#D1CDC4,inset_-3px_-3px_6px_#FFFFFF] border border-[#E86A5B]/60 scale-[1.02]'
                      : 'neu-card hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[#E86A5B]' : 'text-[#1F1F1F]'}`}>
                      {day.day_of_month}
                    </span>

                    {day.availability_status === 'AVAILABLE' ? (
                      <span className="w-2 h-2 rounded-full bg-[#3FA66B]" title="Available" />
                    ) : day.availability_status === 'BLOCKED' ? (
                      <span className="w-2 h-2 rounded-full bg-[#D9534F]" title="Blocked / Leave" />
                    ) : day.availability_status === 'BOOKED' ? (
                      <span className="w-2 h-2 rounded-full bg-[#D9A441]" title="Multiple Bookings" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#E86A5B]" title="1 Event Booked" />
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-hidden">
                    {hasEvents && (
                      <div className="text-[9px] font-bold text-white bg-[#E86A5B] px-1.5 py-0.5 rounded truncate shadow-sm">
                        📸 {day.events[0].name.split(' ')[0]}
                      </div>
                    )}
                    {hasBlocked && (
                      <div className="text-[9px] font-bold text-white bg-[#D9534F] px-1.5 py-0.5 rounded truncate shadow-sm">
                        ⛔ Blocked
                      </div>
                    )}
                    {!hasEvents && !hasBlocked && hasNotes && (
                      <div className="text-[9px] font-bold text-[#1F1F1F] bg-[#EBE8E1] px-1.5 py-0.5 rounded truncate">
                        📝 Note
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Day Detail Agenda Sidebar */}
        <div className="p-6 rounded-3xl neu-card space-y-6">
          {selectedDay ? (
            <>
              {/* Day Header */}
              <div className="pb-4 border-b border-[#E8E5E2]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#6B6B6B]">{selectedDay.day_name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedDay.availability_status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-[#3FA66B] border-emerald-200'
                      : selectedDay.availability_status === 'BLOCKED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-[#E86A5B]/10 text-[#E86A5B] border-[#E86A5B]/25'
                  }`}>
                    {selectedDay.availability_status}
                  </span>
                </div>
                <h3 className="text-2xl font-display font-extrabold text-[#1F1F1F] mt-1">
                  {new Date(selectedDay.date_str).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>

                <button
                  onClick={() => handleOpenAddNote(selectedDay.date_str)}
                  className="mt-3 w-full py-2.5 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2] hover:border-[#E86A5B]/40 text-[#1F1F1F] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E86A5B]" />
                  <span>Add Note / Reminder for this Date</span>
                </button>
              </div>

              {/* Scheduled Events Section */}
              <div>
                <h4 className="text-xs font-bold text-[#E86A5B] uppercase tracking-wider mb-3">
                  📸 Scheduled Shoots ({selectedDay.events.length})
                </h4>

                {selectedDay.events.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] text-center text-xs text-[#6B6B6B]">
                    No wedding shoots booked on this date. You are open for client inquiries!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDay.events.map((ev) => (
                      <div key={ev.id} className="p-3.5 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-[#1F1F1F] block">{ev.name}</span>
                            <span className="text-[11px] text-[#6B6B6B]">Client: {ev.client_name || 'Direct Client'}</span>
                          </div>
                          <span className="text-xs font-bold text-[#E86A5B]">
                            ₹{ev.package_amount_inr.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {(ev.venue || ev.city) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                            <MapPin className="w-3.5 h-3.5 text-[#E86A5B]" />
                            <span>{[ev.venue, ev.city].filter(Boolean).join(', ')}</span>
                          </div>
                        )}

                        <Link
                          href={`/dashboard/events/${ev.id}`}
                          className="w-full py-1.5 rounded-lg bg-[#E86A5B] hover:bg-[#C94F43] text-white text-[11px] font-bold text-center block transition-all shadow-sm"
                        >
                          Open Command Center →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CRM Inquiries & Leads on this Date */}
              {selectedDay.leads.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#D9A441] uppercase tracking-wider mb-3">
                    💼 Active CRM Inquiries ({selectedDay.leads.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.leads.map((ld) => (
                      <div key={ld.id} className="p-3 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2] text-xs">
                        <div className="flex items-center justify-between font-bold text-[#1F1F1F]">
                          <span>{ld.client_name}</span>
                          <span className="text-[#D9A441]">₹{ld.estimated_budget_inr.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                          {ld.event_type} • Stage: <span className="text-[#D9A441] font-bold uppercase">{ld.stage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Notes & Blocked Dates Section */}
              <div>
                <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">
                  📝 Notes & Reminders ({selectedDay.notes.length})
                </h4>

                {selectedDay.notes.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] text-center text-xs text-[#6B6B6B]">
                    No notes logged for this day.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDay.notes.map((nt) => (
                      <div key={nt.id} className="p-3 rounded-xl bg-[#FAF9F7] border border-[#E8E5E2] flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              nt.category === 'BLOCKED' || nt.category === 'LEAVE'
                                ? 'bg-rose-100 text-rose-700'
                                : nt.category === 'REMINDER'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#E86A5B]/15 text-[#E86A5B]'
                            }`}>
                              {nt.category}
                            </span>
                            <span className="text-xs font-bold text-[#1F1F1F]">{nt.title}</span>
                          </div>
                          {nt.description && (
                            <p className="text-[11px] text-[#6B6B6B] leading-relaxed">{nt.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setNoteToDeleteId(nt.id)}
                          className="text-[#8E8E8E] hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-[#6B6B6B] text-xs font-medium">
              Select any date from the calendar to view its schedule.
            </div>
          )}
        </div>
      </div>

      {/* ADD NOTE / BLOCK DATE MODAL */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Add Note / Block Date"
        subtitle="Save personal studio reminders or block this date from wedding inquiries."
        icon={<CalendarIcon className="w-5 h-5 text-[#E86A5B]" />}
        size="md"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'NOTE', label: '📝 Note' },
                { id: 'REMINDER', label: '⏰ Reminder' },
                { id: 'BLOCKED', label: '⛔ Block Date' },
                { id: 'LEAVE', label: '🏖️ Leave' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNoteCategory(cat.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer truncate ${
                    noteCategory === cat.id
                      ? 'bg-[#E86A5B] border-[#E86A5B] text-white shadow-sm'
                      : 'bg-[#FAF9F7] border-[#E8E5E2] text-[#6B6B6B] hover:text-[#1F1F1F]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Date</label>
            <input
              type="date"
              required
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="gmm-input font-mono w-full"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Title / Reason *</label>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Lens rental pickup, Bride father call, Family holiday"
              className="gmm-input w-full"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-bold text-[#1F1F1F] mb-1.5">Description / Details (Optional)</label>
            <textarea
              rows={2}
              value={noteDescription}
              onChange={(e) => setNoteDescription(e.target.value)}
              placeholder="Additional instructions or notes..."
              className="gmm-input w-full resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-[#E8E5E2]">
            <button
              type="button"
              onClick={() => setShowNoteModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-[#E8E5E2] hover:bg-[#EBE8E1] text-[#6B6B6B] text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingNote}
              className="flex-1 btn-primary py-2.5 text-xs font-bold"
            >
              {savingNote ? 'Saving...' : 'Save to Calendar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE NOTE DIALOG */}
      <ConfirmDialog
        isOpen={!!noteToDeleteId}
        onClose={() => setNoteToDeleteId(null)}
        onConfirm={handleConfirmDeleteNote}
        title="Delete Calendar Entry?"
        message="Are you sure you want to remove this note/blocked date from your studio calendar?"
        confirmText="Delete Note"
        isDanger={true}
        loading={deletingNote}
      />
    </div>
  );
}
