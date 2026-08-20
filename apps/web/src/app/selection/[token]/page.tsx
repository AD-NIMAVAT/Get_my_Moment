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
      <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E86A5B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-[#6B6B6B] tracking-wider uppercase">Loading Album Proofing Portal...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#F3F1EC] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl neu-card text-center">
          <h2 className="text-xl font-display font-extrabold text-[#1F1F1F] mb-2">Invalid Selection Link</h2>
          <p className="text-xs text-[#6B6B6B]">{error}</p>
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
    <div className="min-h-screen bg-[#F3F1EC] text-[#1F1F1F] pb-16 selection:bg-[#E86A5B] selection:text-white">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1850px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Header Card */}
        <div className="neu-card p-6 sm:p-8 relative overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold text-[#E86A5B] bg-[#E86A5B]/10 border border-[#E86A5B]/20 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E86A5B]" />
                <span>ALBUM PROOFING & PHOTO SELECTION</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
                {data?.event_name}
              </h1>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1 font-medium">
                Prepared for <strong className="text-[#1F1F1F]">{data?.client_name || 'Bride & Groom'}</strong> by <strong className="text-[#E86A5B]">{data?.studio_name}</strong>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="px-5 py-3 rounded-2xl bg-[#FAF9F7] border border-[#E8E5E2] text-center w-full sm:w-auto">
                <span className="text-[10px] font-bold text-[#6B6B6B] uppercase block">Selected Photos</span>
                <span className="text-2xl font-display font-black text-[#E86A5B]">
                  {selectedCount} <span className="text-xs text-[#6B6B6B] font-bold">/ {data?.total_photos}</span>
                </span>
              </div>

              <button
                onClick={handleSubmitSelection}
                disabled={submitting || data?.is_submitted}
                className="w-full sm:w-auto btn-primary py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#E86A5B]/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{data?.is_submitted ? 'Selection Submitted ✓' : submitting ? 'Submitting...' : 'Submit Final Selection'}</span>
              </button>
            </div>
          </div>

          {submittedMessage && (
            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{submittedMessage}</span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E2DDD5] mb-6 scrollbar-none">
          <button
            onClick={() => setActiveCeremony('ALL')}
            className={`py-2.5 px-4 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeCeremony === 'ALL'
                ? 'bg-[#E86A5B] text-white shadow-md'
                : 'bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]'
            }`}
          >
            All Photos ({data?.total_photos})
          </button>
          <button
            onClick={() => setActiveCeremony('SELECTED_ONLY')}
            className={`py-2.5 px-4 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeCeremony === 'SELECTED_ONLY'
                ? 'bg-[#E86A5B] text-white shadow-md'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>My Selected Favorites ({selectedCount})</span>
          </button>

          {data?.ceremonies.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCeremony(c.id)}
              className={`py-2.5 px-4 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCeremony === c.id
                  ? 'bg-[#E86A5B] text-white shadow-md'
                  : 'bg-[#EBE8E1] text-[#6B6B6B] hover:text-[#1F1F1F]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Photos Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="p-16 text-center rounded-3xl neu-card">
            <ImageIcon className="w-10 h-10 text-[#6B6B6B] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1F1F1F]">No photos in this category</h3>
            <p className="text-xs text-[#6B6B6B] mt-1">Select a different ceremony filter above.</p>
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
                      ? 'border-[#E86A5B] shadow-[0_8px_20px_rgba(232,106,91,0.25)] ring-2 ring-[#E86A5B]/40'
                      : 'border-[#E2DDD5] bg-[#FAF9F7] hover:border-[#E86A5B]/50'
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
                    className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? 'bg-[#E86A5B] text-white scale-110'
                        : 'bg-white/80 text-[#6B6B6B] hover:text-[#E86A5B] hover:bg-white'
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
                    className={`absolute top-2.5 left-2.5 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-md ${
                      comment
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/80 text-[#6B6B6B] hover:text-purple-600 opacity-0 group-hover:opacity-100 hover:bg-white'
                    }`}
                    title="Add special instructions for album designer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>

                  {/* Bottom filename / note badge */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-[10px]">
                    <span className="text-white font-mono truncate">{p.original_file_name}</span>
                    {comment && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500 text-white font-bold">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl neu-card shadow-2xl bg-[#F3F1EC]">
              <h3 className="text-base font-display font-extrabold text-[#1F1F1F] mb-1">Album Designer Note</h3>
              <p className="text-xs text-[#6B6B6B] mb-4">
                Add custom instructions (e.g. &quot;Use on 2-page opening spread&quot;, &quot;Keep full height&quot;).
              </p>

              <textarea
                rows={3}
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                placeholder="e.g. Cover page photo / Crop closer to bride..."
                className="gmm-input w-full mb-4 text-xs font-medium"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setCommentModalPhoto(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:text-[#1F1F1F]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveComment}
                  className="btn-primary py-2 px-4 rounded-xl font-bold text-xs"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
