'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

interface Status {
  id: string;
  content: string;
  image: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  author: {
    _id: string;
    name: string;
    avatar: string;
    username?: string;
  };
  createdAt: string;
  isLiked: boolean;
}

export default function StatusDetailPage() {
  const router = useRouter();
  const params = useParams();
  const statusId = params.statusId as string;
  const user = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (!token && !user) {
        router.push('/login');
      } else {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [user, router]);

  useEffect(() => {
    if (!isCheckingAuth && user) {
      fetchStatus();
    }
  }, [statusId, user, isCheckingAuth]);

  const fetchStatus = async () => {
    try {
      const response = await api.get(`/status/${statusId}`);
      setStatus(response.data);
    } catch (error: any) {
      console.error('Failed to fetch status:', error);
      
      // Check if it's a 404 or the status doesn't exist
      if (error.response?.status === 404) {
        toast.error('Status not found');
      } else {
        toast.error('Failed to load status');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!status) return;
    
    try {
      await api.post(`/status/${status.id}/like`);
      setStatus(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
      } : null);
    } catch (error) {
      console.error('Failed to like status:', error);
      toast.error('Failed to like status');
    }
  };

  const handleShare = () => {
    if (!status) return;
    const statusUrl = `${window.location.origin}/status/${status.id}`;
    const shareText = `Check out this status from ${status.author.name}`;
    
    if (navigator.share) {
      navigator.share({
        title: shareText,
        text: status.content,
        url: statusUrl,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      });
    } else {
      navigator.clipboard.writeText(statusUrl).then(() => {
        toast.success('Status link copied to clipboard!');
      }).catch((error) => {
        console.error('Failed to copy:', error);
        toast.error('Failed to copy link');
      });
    }
  };

  const handleRepostNow = async () => {
    if (!status) return;
    
    try {
      await api.post(`/status/${status.id}/repost`);
      toast.success('Reposted successfully!');
      router.push('/status');
    } catch (error: any) {
      console.error('Failed to repost:', error);
      const errorMessage = error.response?.data?.message || 'Failed to repost';
      toast.error(errorMessage);
    }
  };

  if (loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={
          theme === 'dark'
            ? { background: '#000000' }
            : theme === 'light'
            ? { background: '#e6e6e6' }
            : {
                background: background
                  ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${background})`
                  : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
              }
        }
      >
        <div className="text-center px-4">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-auto">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-black mb-2">Status Not Found</h2>
            <p className="text-gray-600 mb-6">
              This status may have been deleted or the link is incorrect.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={
        theme === 'dark'
          ? { background: '#000000' }
          : theme === 'light'
          ? { background: '#e6e6e6' }
          : {
              background: background
                ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${background})`
                : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }
      }
    >
      <AppHeader />

      <div className="flex items-center justify-center px-4 py-6 pb-24 min-h-screen">
        {/* Status Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-lg inline-block max-w-2xl">
          {/* Author Info */}
          <div className="p-4 flex items-center gap-3">
            <Image
              src={status.author.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
              alt={status.author.name}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover"
              onClick={() => {
                if (status.author.username) {
                  router.push(`/${status.author.username}`);
                }
              }}
              style={{ cursor: status.author.username ? 'pointer' : 'default' }}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-black">{status.author.name}</h3>
              {status.author.username && (
                <p className="text-sm text-gray-500">@{status.author.username}</p>
              )}
            </div>
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Images */}
          {status.images && status.images.length > 0 && (
            <div className="overflow-y-auto snap-y snap-mandatory max-h-[70vh]">
              {status.images.map((image, index) => (
                <div key={index} className="relative snap-start">
                  <Image
                    src={image}
                    alt={`Status image ${index + 1}`}
                    width={800}
                    height={800}
                    className="w-auto h-auto max-w-full"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Status Content */}
          <div className="p-4">
            <p className="text-black mb-4">{status.content}</p>

            {/* Like and Share */}
            <div className="flex items-center gap-6 mb-4">
              <button
                onClick={handleLike}
                className="flex items-center gap-2"
              >
                <svg 
                  className={`w-6 h-6 ${status.isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-600'}`}
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-black font-medium">{status.likesCount}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>

            {/* Repost Buttons - Only show if not the author */}
            {status.author._id !== user?.id && (
              <div className="space-y-2">
                <button
                  onClick={handleRepostNow}
                  className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Repost Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation or Login Button */}
      <BottomNav />
    </div>
  );
}
