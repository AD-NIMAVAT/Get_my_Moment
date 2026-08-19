'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let sizeClass = 'max-w-xl';
  if (size === 'sm') sizeClass = 'max-w-md';
  if (size === 'md') sizeClass = 'max-w-xl';
  if (size === 'lg') sizeClass = 'max-w-2xl';
  if (size === 'xl') sizeClass = 'max-w-4xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md animate-backdrop-smooth transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal / Bottom Sheet Card */}
      <div 
        className={`relative w-full ${sizeClass} bg-[#F3F1EC] rounded-t-[2rem] sm:rounded-3xl border-t sm:border border-white/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),10px_10px_30px_#D0CCC3,-10px_-10px_30px_#FFFFFF] animate-bottom-sheet sm:animate-modal-smooth z-10 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden pb-safe sm:pb-0 transition-all duration-300 ease-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-[#D4D0C7] rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Sticky Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#E2DDD5] flex items-start justify-between gap-4 flex-shrink-0 bg-[#F3F1EC]">
          <div className="flex items-start gap-3.5">
            {icon && (
              <div className="w-10 h-10 rounded-2xl bg-[#F3F1EC] shadow-[4px_4px_8px_#D4D0C7,-4px_-4px_8px_#FFFFFF] border border-white/60 text-[#E86A5B] flex items-center justify-center flex-shrink-0 mt-0.5">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg sm:text-xl font-display font-extrabold text-[#1F1F1F] tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#6B6B6B] mt-1 font-normal leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="neu-icon-btn w-8 h-8 rounded-xl text-[#6B6B6B] hover:text-[#1F1F1F] hover:scale-110 active:scale-95 transition-transform flex-shrink-0"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-[#E2DDD5] bg-[#EBE8E1]/80 flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
