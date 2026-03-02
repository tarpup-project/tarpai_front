'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import publicApi from '@/lib/publicApi';
import toast from 'react-hot-toast';

interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  features: string[];
  bugFixes: string[];
  improvements: string[];
  releaseDate: string;
}

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const { theme } = useTheme();
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReleaseNotes();
    }
  }, [isOpen]);

  const fetchReleaseNotes = async () => {
    setLoading(true);
    try {
      const response = await publicApi.get('/support/releases');
      setReleaseNotes(response.data);
    } catch (error) {
      console.error('Failed to fetch release notes:', error);
      toast.error('Failed to load release notes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">✨</span>
            </div>
            <h2 className="text-xl font-bold text-black">
              What's New
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : releaseNotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No release notes available
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {releaseNotes.map((note) => (
                <div key={note.id} className="space-y-4">
                  {/* Version Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <h3 className="text-lg font-bold text-black">
                        {note.version}
                      </h3>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(note.releaseDate)}
                    </span>
                  </div>

                  {/* Features */}
                  {note.features.length > 0 && (
                    <div className="space-y-2">
                      {note.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-700">
                            {feature}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bug Fixes */}
                  {note.bugFixes.length > 0 && (
                    <div className="space-y-2">
                      {note.bugFixes.map((fix, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-700">
                            {fix}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Improvements */}
                  {note.improvements.length > 0 && (
                    <div className="space-y-2">
                      {note.improvements.map((improvement, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-700">
                            {improvement}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}