'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface NeomorphicSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[] | string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NeomorphicSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
}: NeomorphicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = options.map((opt) => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 box-border ${className}`}>
      {/* Trigger Button (Sunken Neomorphic Well) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-w-0 flex items-center justify-between gap-2 px-3.5 py-3 rounded-2xl bg-[#EBE8E1] text-xs font-bold text-[#1F1F1F] transition-all cursor-pointer box-border ${
          isOpen 
            ? 'shadow-[inset_4px_4px_8px_#D1CDC4,inset_-4px_-4px_8px_#FFFFFF,0_0_0_2px_rgba(232,106,91,0.5)] border border-[#E86A5B]/50'
            : 'shadow-[inset_4px_4px_8px_#D1CDC4,inset_-4px_-4px_8px_#FFFFFF] border border-white/40 hover:border-[#E86A5B]/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate text-left flex-1 min-w-0 ${selectedOption ? 'text-[#1F1F1F] font-bold' : 'text-[#8E8E8E]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className={`w-6 h-6 rounded-xl bg-[#F3F1EC] shadow-[2px_2px_5px_#D4D0C7,-2px_-2px_5px_#FFFFFF] flex items-center justify-center text-[#E86A5B] transition-transform duration-200 flex-shrink-0 ${
          isOpen ? 'rotate-180' : ''
        }`}>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </button>

      {/* Dropdown Menu (Extruded Floating Neomorphic Card) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2.5 z-[9999] p-2 rounded-2xl bg-[#F3F1EC] border border-white shadow-[12px_12px_28px_#C5C1B8,-12px_-12px_28px_#FFFFFF] min-w-[200px] max-h-72 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            {normalizedOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBE8E1] text-[#E86A5B] shadow-[inset_2px_2px_5px_#D1CDC4,inset_-2px_-2px_5px_#FFFFFF]'
                      : 'text-[#1F1F1F] hover:bg-[#EBE8E1]/80 hover:text-[#E86A5B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{opt.label}</span>
                    {opt.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#E86A5B]/15 text-[#E86A5B] font-bold">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#E86A5B] stroke-[3]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
