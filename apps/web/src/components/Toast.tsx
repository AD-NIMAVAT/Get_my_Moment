'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let icon = <CheckCircle2 className="w-5 h-5 text-[#3FA66B] flex-shrink-0" />;
        let borderClass = 'border-emerald-200 bg-white text-[#1F1F1F] shadow-lg shadow-emerald-500/10';
        let badgeClass = 'bg-emerald-50 text-[#3FA66B]';

        if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />;
          borderClass = 'border-rose-200 bg-white text-[#1F1F1F] shadow-lg shadow-rose-500/10';
          badgeClass = 'bg-rose-50 text-rose-600';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-[#D99A2B] flex-shrink-0" />;
          borderClass = 'border-amber-200 bg-white text-[#1F1F1F] shadow-lg shadow-amber-500/10';
          badgeClass = 'bg-amber-50 text-[#8F6420]';
        } else if (toast.type === 'info') {
          icon = <Info className="w-5 h-5 text-[#E86A5B] flex-shrink-0" />;
          borderClass = 'border-[#E8E5E2] bg-white text-[#1F1F1F] shadow-lg shadow-primary-500/10';
          badgeClass = 'bg-[#E86A5B]/10 text-[#E86A5B]';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border flex items-start justify-between gap-3 animate-toast ${borderClass}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1 rounded-xl ${badgeClass}`}>
                {icon}
              </div>
              <p className="text-xs font-semibold text-[#1F1F1F] leading-snug mt-0.5">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => onRemove(toast.id)}
              className="text-[#8E8E8E] hover:text-[#1F1F1F] p-1 transition-colors cursor-pointer rounded-lg hover:bg-neutral-100"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
