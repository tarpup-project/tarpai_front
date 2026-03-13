'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import EditRepostModal from '@/components/EditRepostModal';

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
  isReposted?: boolean;
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
  };
}

export default function StatusHistoryPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);

  // Check authentication immediately using localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return;
    
    if (user) {
      fetchStatuses();
    }
  }, [user, isCheckingAuth]);

  const fetchStatuses = async () => {
    try {
      const response = await api.get('/status/my');
      console.log('User statuses:', response.data);
      
      // Sort by creation date (newest first)
      const sorted = response.data.sort((a: Status, b: Status) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setStatuses(sorted);
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
      toast.error('Failed to load status history');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Check if status is older than 24 hours (disappeared from feeds)
  const isStatusOlderThan24Hours = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return date < twentyFourHoursAgo;
  };

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return;
    
    try {
      await api.delete(`/status/${statusId}`);
      toast.success('Status deleted successfully!');
      setStatuses(prev => prev.filter(s => s.id !== statusId));
    } catch (error) {
      console.error('Failed to delete status:', error);
      toast.error('Failed to delete status');
    }
  };

  const handleLike = async (statusId: string) => {
    try {
      await api.post(`/status/${statusId}/like`);
      
      setStatuses(prev => prev.map(status =>
        status.id === statusId
          ? { ...status, isLiked: !status.isLiked, likesCount: status.isLiked ? status.likesCount - 1 : status.likesCount + 1 }
          : status
      ));
    } catch (error) {
      console.error('Failed to like status:', error);
      toast.error('Failed to like status');
    }
  };

  const handleRepostNow = async (status: Status) => {
    try {
      await api.post(`/status/${status.id}/repost`);
      toast.success('Reposted successfully!');
    } catch (error: any) {
      console.error('Failed to repost:', error);
      const errorMessage = error.response?.data?.message || 'Failed to repost';
      toast.error(errorMessage);
    }
  };

  const handleEditRepost = (status: Status) => {
    setSelectedStatus(status);
    setShowRepostModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${
        theme === 'light' ? 'text-black' : 'text-white'
      }`}
      style={
        theme === 'light'
          ? {
              background: '#e6e6e6',
            }
          : theme === 'dark'
          ? {
              background: '#000000',
            }
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
      {/* Overlay */}
      {theme === 'background' && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <AppHeader />

        {/* Title */}
        <div className="px-4 py-6">
          <h1 className={`text-3xl font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>
            My Status History
          </h1>
          <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} mt-1`}>
            {statuses.length} {statuses.length === 1 ? 'status' : 'statuses'}
          </p>
        </div>

        {/* Status List */}
        <div className="flex-1 px-4 pb-32 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {statuses.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    className={`flex flex-col ${theme === 'light' ? 'bg-white/40' : 'bg-white/10 border border-white/30'} backdrop-blur-md rounded-2xl overflow-hidden`}
                  >
                    {/* Image */}
                    {status.images && status.images.length > 0 ? (
                      <div className="relative h-48 overflow-hidden cursor-pointer group" onClick={() => router.push(`/status/${status.id}`)}>
                        <Image
                          src={status.images[0]}
                          alt="Status"
                          width={400}
                          height={300}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        {/* Image count badge */}
                        {status.images.length > 1 && (
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-white">
                            +{status.images.length - 1}
                          </div>
                        )}
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStatus(status.id);
                          }}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-full p-2 transition"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className={`relative h-48 flex items-center justify-center cursor-pointer group ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'}`} onClick={() => router.push(`/status/${status.id}`)}>
                        <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                          No image
                        </p>
                        {/* Delete button for no-image cards */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStatus(status.id);
                          }}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-full p-2 transition"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-4">
                      {/* Text Content */}
                      {status.content && (
                        <p className={`text-sm mb-3 line-clamp-2 ${theme === 'light' ? 'text-black' : 'text-gray-200'}`}>
                          {status.content}
                        </p>
                      )}

                      {/* Time and Likes */}
                      <div className="flex items-center justify-between text-xs mb-3 mt-auto">
                        <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                          {getTimeAgo(status.createdAt)}
                        </span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
                            {status.likesCount}
                          </span>
                        </div>
                      </div>

                      {/* Buttons - Only show if status is older than 24 hours (disappeared from feeds) */}
                      {isStatusOlderThan24Hours(status.createdAt) && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleRepostNow(status)}
                            className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                              theme === 'light'
                                ? 'bg-gray-600 text-white hover:bg-gray-700'
                                : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                            Repost
                          </button>
                          <button
                            onClick={() => handleEditRepost(status)}
                            className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                              theme === 'light'
                                ? 'bg-black/20 text-white hover:bg-black/30'
                                : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit & Repost
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                  No statuses yet. Create your first status!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Edit & Repost Modal */}
      <EditRepostModal
        isOpen={showRepostModal}
        status={selectedStatus}
        theme={theme}
        onClose={() => {
          setShowRepostModal(false);
          setSelectedStatus(null);
        }}
        onSuccess={() => {
          fetchStatuses();
        }}
      />
    </div>
  );
}
