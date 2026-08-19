'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api, ClientSelectionData } from '@/lib/api';
import { 
  Heart, Check, Sparkles, MessageCircle, Send, 
  Image as ImageIcon, CheckCircle2, ShieldCheck, X, Filter 
} from 'lucide-react';

export default function ClientSelectionPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<ClientSelectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCeremony, setActiveCeremony] = useState<string>('ALL');
  const [selectedPhotos, setSelectedPhotos] = useState<Record<string, { isSelected: boolean; comment?: string }>>({});
  const [commentModalPhoto, setCommentModalPhoto] = useState<string | null>(null);
  const [tempComment, setTempComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadSelectionData();
    }
  }, [token]);

  const loadSelectionData = async () => {
    try {
      setLoading(true);
      const res = await api.getClientSelection(token);
      setData(res);

      // Initialize local selection state
      const initialMap: Record<string, { isSelected: boolean; comment?: string }> = {};
      for (const p of res.photos) {
        if (p.is_client_selected) {
          initialMap[p.id] = { isSelected: true, comment: p.client_comment || '' };
        }
      }
      setSelectedPhotos(initialMap);
    } catch (err: any) {
      setError(err.message || 'Unable to load album selection gallery.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = async (photoId: string) => {
    const current = selectedPhotos[photoId]?.isSelected || false;
    const newState = !current;
    
    // Optimistic UI update
    setSelectedPhotos((prev) => ({
      ...prev,
      [photoId]: { isSelected: newState, comment: prev[photoId]?.comment || '' },
    }));

    try {
      await api.togglePhotoSelection(token, photoId, newState, selectedPhotos[photoId]?.comment);
    } catch (err) {
      console.error('Failed to sync selection:', err);
    }
  };

  const handleSaveComment = async () => {
    if (!commentModalPhoto) return;
    const photoId = commentModalPhoto;
    const isSelected = selectedPhotos[photoId]?.isSelected || true;

    setSelectedPhotos((prev) => ({
      ...prev,
      [photoId]: { isSelected: isSelected, comment: tempComment },
    }));

    try {
      await api.togglePhotoSelection(token, photoId, isSelected, tempComment);
    } catch (err) {
      console.error('Failed to save comment:', err);
    } finally {
      setCommentModalPhoto(null);
    }
  };

  const handleSubmitSelection = async () => {
    const selectedCount = Object.values(selectedPhotos).filter((v) => v.isSelected).length;
    if (selectedCount === 0) {
      alert('Please select at least one photo for your album before submitting.');
      return;
    }

    if (!confirm(`Are you sure you want to submit ${selectedCount} selected photos to ${data?.studio_name}?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitAlbumSelection(token);
      setSubmittedMessage(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to submit selection');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400 font-mono">Loading Album Selection Portal...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl glass-panel border border-rose-500/25 text-center shadow-2xl">
          <h2 className="text-xl font-display font-bold text-white mb-2">Invalid Selection Link</h2>
          <p className="text-xs text-slate-400 font-light">{error}</p>
        </div>
      </div>
    );
  }

  const selectedCount = Object.values(selectedPhotos).filter((v) => v.isSelected).length;
  const filteredPhotos = data?.photos.filter((p) => {
    if (activeCeremony === 'ALL') return true;
    if (activeCeremony === 'SELECTED_ONLY') return selectedPhotos[p.id]?.isSelected;
    return p.ceremony_id === activeCeremony;
  }) || [];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Client Header Card */}
      <div className="p-8 rounded-3xl glass-panel border border-brand-500/25 shadow-2xl relative overflow-hidden mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-brand-300 bg-brand-500/10 border border-brand-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>ALBUM PROOFING & PHOTO SELECTION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              {data?.event_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-light">
              Prepared for <strong className="text-white">{data?.client_name || 'Bride & Groom'}</strong> by <strong className="text-brand-400">{data?.studio_name}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="px-5 py-3 rounded-2xl bg-obsidian-950/80 border border-white/10 text-center">
              <span className="text-[11px] font-mono text-slate-400 uppercase block">Selected Photos</span>
              <span className="text-2xl font-display font-bold gold-gradient-text">
                {selectedCount} <span className="text-xs text-slate-500 font-normal">/ {data?.total_photos}</span>
              </span>
            </div>

            <button
              onClick={handleSubmitSelection}
              disabled={submitting || data?.is_submitted}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-400 hover:to-amber-500 text-obsidian-950 font-bold text-xs shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{data?.is_submitted ? 'Selection Submitted ✓' : submitting ? 'Submitting...' : 'Submit Final Selection'}</span>
            </button>
          </div>
        </div>

        {submittedMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{submittedMessage}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.08] mb-6">
        <button
          onClick={() => setActiveCeremony('ALL')}
          className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeCeremony === 'ALL'
              ? 'bg-brand-500 text-obsidian-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white bg-obsidian-950/60 border border-white/[0.06]'
          }`}
        >
          All Photos ({data?.total_photos})
        </button>
        <button
          onClick={() => setActiveCeremony('SELECTED_ONLY')}
          className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeCeremony === 'SELECTED_ONLY'
              ? 'bg-brand-500 text-obsidian-950 font-bold shadow-md'
              : 'text-brand-400 hover:text-brand-300 bg-obsidian-950/60 border border-brand-500/25'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>My Selected Favorites ({selectedCount})</span>
        </button>

        {data?.ceremonies.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCeremony(c.id)}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeCeremony === c.id
                ? 'bg-brand-500 text-obsidian-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white bg-obsidian-950/60 border border-white/[0.06]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-white/10 glass-panel">
          <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No photos in this category</h3>
          <p className="text-xs text-slate-400 mt-1">Select a different ceremony filter above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPhotos.map((p) => {
            const isSelected = selectedPhotos[p.id]?.isSelected || false;
            const comment = selectedPhotos[p.id]?.comment;

            return (
              <div
                key={p.id}
                className={`group relative rounded-2xl overflow-hidden aspect-square border transition-all ${
                  isSelected
                    ? 'border-brand-400 shadow-xl shadow-brand-500/15 ring-2 ring-brand-400/40'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <img
                  src={api.getThumbnailUrl(p.id)}
                  alt={p.original_file_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Heart Toggle Button */}
                <button
                  onClick={() => handleToggleSelect(p.id)}
                  className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-500 text-obsidian-950 scale-110 shadow-lg'
                      : 'bg-black/60 text-white/70 hover:text-white hover:bg-black/80'
                  }`}
                  title={isSelected ? 'Remove from Album' : 'Select for Album'}
                >
                  <Heart className={`w-4 h-4 ${isSelected ? 'fill-current' : ''}`} />
                </button>

                {/* Note Button */}
                <button
                  onClick={() => {
                    setCommentModalPhoto(p.id);
                    setTempComment(comment || '');
                  }}
                  className={`absolute top-2.5 left-2.5 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                    comment
                      ? 'bg-purple-500 text-white'
                      : 'bg-black/60 text-white/70 hover:text-white opacity-0 group-hover:opacity-100'
                  }`}
                  title="Add special instructions for album designer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>

                {/* Bottom filename / note badge */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-[10px]">
                  <span className="text-white/80 font-mono truncate">{p.original_file_name}</span>
                  {comment && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/80 text-white font-medium">
                      Note
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      {commentModalPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl glass-panel border border-brand-500/25 shadow-2xl">
            <h3 className="text-base font-display font-bold text-white mb-1">Album Designer Note</h3>
            <p className="text-xs text-slate-400 mb-4 font-light">
              Add custom instructions (e.g. "Use on 2-page opening spread", "Keep full height").
            </p>

            <textarea
              rows={3}
              value={tempComment}
              onChange={(e) => setTempComment(e.target.value)}
              placeholder="e.g. Cover page photo / Crop closer to bride..."
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCommentModalPhoto(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComment}
                className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-obsidian-950 font-bold text-xs"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
