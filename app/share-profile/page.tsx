'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ShareProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { theme, bg, text, border, spinner } = useTheme();
  const [qrCode, setQrCode] = useState<string>('');
  const [profileUrl, setProfileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchShareData();
  }, [user, router]);

  const fetchShareData = async () => {
    try {
      const [qrResponse, shareResponse] = await Promise.all([
        api.get('/users/profile/qrcode'),
        api.get('/users/profile/share'),
      ]);

      setQrCode(qrResponse.data.qrCode);
      setProfileUrl(shareResponse.data.profileUrl || `${window.location.origin}/${user?.username || user?.id}`);
    } catch (error) {
      console.error('Failed to fetch share data:', error);
      toast.error('Failed to load share data');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = 'profile-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${bg.primary} ${text.primary} flex items-center justify-center`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${spinner}`}></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg.primary} ${text.primary}`}>
      {/* Header */}
      <div className={`sticky top-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md border-b ${border.primary} z-10`}>
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className={`w-10 h-10 rounded-full ${bg.button} ${bg.buttonHover} flex items-center justify-center transition`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Share Your Profile</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-md mx-auto">
        {/* QR Code Section */}
        {qrCode && (
          <div className="mb-6 flex flex-col items-center">
            <div className={`${theme === 'dark' ? 'bg-white' : 'bg-gray-100'} rounded-2xl p-6 shadow-lg w-fit`}>
              <Image
                src={qrCode}
                alt="Profile QR Code"
                width={250}
                height={250}
                className="w-64 h-64"
              />
            </div>
            <p className={`text-sm ${text.secondary} text-center mt-4`}>
              Point your camera at the QR code to access profile
            </p>
          </div>
        )}

        {/* Share Options */}
        <div className="space-y-3">
          <button
            onClick={handleCopyLink}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className={`w-10 h-10 ${bg.button} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium">Copy link</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${user?.displayName || user?.name}'s Profile`,
                  text: 'Check out my profile!',
                  url: profileUrl,
                });
              } else {
                toast.error('Sharing not supported on this device');
              }
            }}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className={`w-10 h-10 ${bg.button} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <span className="font-medium">Text your profile</span>
          </button>

          <button
            onClick={() => {
              console.log('=== EMAIL BUTTON CLICKED ===');
              console.log('Profile URL:', profileUrl);
              const subject = encodeURIComponent('Check out my profile');
              const body = encodeURIComponent(`Check out my profile: ${profileUrl}`);
              const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
              console.log('Mailto URL:', mailtoUrl);
              console.log('Subject:', subject);
              console.log('Body:', body);
              window.location.href = mailtoUrl;
            }}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className={`w-10 h-10 ${bg.button} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-medium">Email your profile</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${user?.displayName || user?.name}'s Profile`,
                  url: profileUrl,
                });
              }
            }}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className={`w-10 h-10 ${bg.button} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <span className="font-medium">Send another way</span>
          </button>

          <button
            onClick={() => {
              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`, '_blank');
            }}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <span className="font-medium">Post to LinkedIn</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <span className="font-medium">Save QR code to photos</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share && qrCode) {
                fetch(qrCode)
                  .then(res => res.blob())
                  .then(blob => {
                    const file = new File([blob], 'qr-code.png', { type: 'image/png' });
                    navigator.share({
                      files: [file],
                      title: 'My Profile QR Code',
                    });
                  })
                  .catch(() => {
                    toast.error('Failed to share QR code');
                  });
              } else {
                toast.error('Sharing not supported on this device');
              }
            }}
            className={`w-full ${bg.button} ${bg.buttonHover} ${text.primary} py-4 px-4 rounded-xl flex items-center gap-3 transition`}
          >
            <div className={`w-10 h-10 ${bg.button} rounded-full flex items-center justify-center`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12" />
              </svg>
            </div>
            <span className="font-medium">Send QR code</span>
          </button>
        </div>
      </div>
    </div>
  );
}
