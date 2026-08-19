'use client';

import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      icon={
        isDanger ? (
          <Trash2 className="w-5 h-5 text-rose-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-[#D9A441]" />
        )
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-[#E8E5E2] hover:bg-neutral-100 text-[#6B6B6B] text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                : 'bg-[#E86A5B] hover:bg-[#C94F43] shadow-primary-500/25'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              confirmText
            )}
          </button>
        </>
      }
    >
      <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
        {message}
      </p>
    </Modal>
  );
}
