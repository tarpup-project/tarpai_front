'use client';

import Image from 'next/image';

interface AvatarPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl: string;
  altText: string;
}

export default function AvatarPreview({ isOpen, onClose, avatarUrl, altText }: AvatarPreviewProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <Image
          src={avatarUrl}
          alt={altText}
          width={800}
          height={800}
          className="w-full h-auto rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
