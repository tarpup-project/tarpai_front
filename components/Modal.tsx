'use client';

import { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxHeight?: string;
}

export default function Modal({ isOpen, onClose, children, title, maxHeight = '85vh' }: ModalProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm z-50 flex items-end`}
      onClick={onClose}
    >
      <div 
        className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl w-full overflow-hidden flex flex-col animate-slide-up`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{title}</h2>
              <button
                onClick={onClose}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
