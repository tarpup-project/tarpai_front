'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function AppearancePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();
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
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : theme === 'light' ? 'text-black' : 'bg-gray-50 text-black'} flex items-center justify-center`}
        style={theme === 'light' ? { background: '#e6e6e6' } : undefined}
      >
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${theme === 'dark' ? 'border-white' : 'border-black'}`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black text-white' : theme === 'light' ? 'text-black' : 'bg-gray-50 text-black'}`}
      style={theme === 'light' ? { background: '#e6e6e6' } : undefined}
    >
      {/* Header */}
      <div className={`sticky top-0 ${theme === 'dark' ? 'bg-black/80 border-white/10' : 'backdrop-blur-md border-gray-200'} backdrop-blur-md border-b z-10`}
        style={theme === 'light' ? { backgroundColor: 'rgba(230, 230, 230, 0.8)' } : theme === 'background' ? { backgroundColor: 'rgba(255, 255, 255, 0.8)' } : undefined}
      >
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'} flex items-center justify-center transition`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Appearance Settings</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className={`px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'} font-semibold hover:opacity-90 transition`}
          >
            Done
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Theme Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Theme</h2>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} bg-gray-200 px-3 py-1 rounded-full`}>Preview</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Background Theme */}
            <button
              onClick={() => {
                useThemeStore.getState().setTheme('background');
                toast.success('Background theme selected');
              }}
              className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-4 transition ${
                theme === 'background' ? 'border-blue-500' : `border-transparent hover:border-gray-300`
              }`}
            >
              <div 
                className="w-full h-full"
                style={{
                  background: selectedBackground 
                    ? `url(${selectedBackground})`
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-white font-semibold text-sm">Background</span>
                </div>
              </div>
              {theme === 'background' && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>

            {/* Light Theme */}
            <button
              onClick={() => {
                useThemeStore.getState().setTheme('light');
                toast.success('Light theme selected');
              }}
              className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-4 transition ${
                theme === 'light' ? 'border-blue-500' : `border-transparent hover:border-gray-300`
              }`}
            >
              <div className="w-full h-full bg-white flex flex-col items-center justify-center">
                <svg className="w-8 h-8 text-gray-800 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-gray-800 font-semibold text-sm">Light</span>
              </div>
              {theme === 'light' && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>

            {/* Dark Theme */}
            <button
              onClick={() => {
                useThemeStore.getState().setTheme('dark');
                toast.success('Dark theme selected');
              }}
              className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-4 transition ${
                theme === 'dark' ? 'border-blue-500' : `border-transparent hover:border-gray-300`
              }`}
            >
              <div className="w-full h-full bg-black flex flex-col items-center justify-center">
                <svg className="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="text-white font-semibold text-sm">Dark</span>
              </div>
              {theme === 'dark' && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Profile Background - Only show when background theme is selected */}
        {theme === 'background' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Profile Background</h2>
              <p className="text-gray-600 text-sm">Choose a background for your profile</p>
            </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Upload Button */}
          <button
            onClick={() => backgroundInputRef.current?.click()}
            disabled={uploadingBackground}
            className="aspect-[3/4] border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-100 rounded-xl flex flex-col items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingBackground ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-2"></div>
                <span className="text-sm text-gray-600">Uploading...</span>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-gray-600 text-center px-2">Choose from device</span>
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
                selectedBackground === bg.url ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
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
            <p className="text-gray-600">No backgrounds available. Upload one to get started!</p>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
