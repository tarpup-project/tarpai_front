'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AppearancePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [loading, setLoading] = useState(true);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchBackgrounds();
  }, [user, router]);

  const fetchBackgrounds = async () => {
    try {
      // Load currently selected background from localStorage
      const currentBg = localStorage.getItem('selectedBackground');
      if (currentBg) {
        setSelectedBackground(currentBg);
      }

      const response = await api.get('/appearance/backgrounds');
      setBackgrounds(response.data.backgrounds || []);
    } catch (error) {
      console.error('Failed to fetch backgrounds:', error);
      toast.error('Failed to load backgrounds');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackground = (backgroundUrl: string) => {
    setSelectedBackground(backgroundUrl);
    // Save to localStorage for persistence
    localStorage.setItem('selectedBackground', backgroundUrl);
    toast.success('Background selected!');
    // Force refresh the background hook
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBackground(true);
    try {
      // Create FormData for background upload
      const formData = new FormData();
      formData.append('background', file);

      // Upload using the dedicated background upload endpoint
      const uploadResponse = await api.post('/appearance/backgrounds/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = uploadResponse.data.background.url;

      toast.success('Background uploaded successfully!');

      // Refresh backgrounds
      const response = await api.get('/appearance/backgrounds');
      setBackgrounds(response.data.backgrounds || []);

      // Automatically select the newly uploaded background
      setSelectedBackground(imageUrl);
      localStorage.setItem('selectedBackground', imageUrl);
      
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload background');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Appearance Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Profile Background</h2>
          <p className="text-gray-400 text-sm">Choose a background for your profile</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Upload Button */}
          <button
            onClick={() => backgroundInputRef.current?.click()}
            disabled={uploadingBackground}
            className="aspect-[3/4] border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:border-white/40 transition disabled:opacity-50 disabled:cursor-not-allowed bg-white/5"
          >
            {uploadingBackground ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                <span className="text-sm text-gray-400">Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-400 text-center px-2">Choose from device</span>
              </>
            )}
          </button>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadBackground}
            className="hidden"
          />

          {/* Background Images */}
          {backgrounds.map((bg) => (
            <button
              key={bg._id}
              onClick={() => handleSelectBackground(bg.url)}
              className={`aspect-[3/4] rounded-xl overflow-hidden border-4 transition relative group ${
                selectedBackground === bg.url ? 'border-blue-500' : 'border-transparent hover:border-white/20'
              }`}
            >
              <Image
                src={bg.thumbnail || bg.url}
                alt={bg.name}
                width={300}
                height={400}
                className="w-full h-full object-cover"
              />
              {selectedBackground === bg.url && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {backgrounds.length === 0 && !uploadingBackground && (
          <div className="text-center py-12">
            <p className="text-gray-400">No backgrounds available. Upload one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
