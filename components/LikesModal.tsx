'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import publicApi from '@/lib/publicApi';
import toast from 'react-hot-toast';

interface LikeUser {
  _id: string;
  name: string;
  displayName: string;
  username: string;
  avatar: string;
}

interface LikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusId: string;
  likesCount: number;
}

export default function LikesModal({ isOpen, onClose, statusId, likesCount }: LikesModalProps) {
  const router = useRouter();
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && statusId) {
      fetchLikes();
    }
  }, [isOpen, statusId]);

  const fetchLikes = async () => {
    setLoading(true);
    try {
      // Try authenticated API first, fallback to public API
      let response;
      try {
        response = await api.get(`/status/${statusId}/likes`);
      } catch (error: any) {
        if (error.response?.status === 401) {
          // Fallback to public API for unauthenticated users
          response = await publicApi.get(`/status/${statusId}/likes`);
        } else {
          throw error;
        }
      }
      
      setLikes(response.data.likes || []);
    } catch (error: any) {
      console.error('Failed to fetch likes:', error);
      toast.error('Failed to load likes');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: LikeUser) => {
    if (user.username) {
      onClose();
      router.push(`/${user.username}`);
    } else {
      toast.error('User profile not available');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-black">Likes</h2>
              <p className="text-sm text-gray-500">{likesCount} {likesCount === 1 ? 'person' : 'people'}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Likes List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
            </div>
          ) : likes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No likes yet</p>
            </div>
          ) : (
            likes.map((user) => (
              <div 
                key={user._id} 
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition"
                onClick={() => handleUserClick(user)}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                    alt={user.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png';
                    }}
                  />
                  <div>
                    <div className="font-semibold text-black">{user.displayName || user.name}</div>
                    {user.username && (
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    )}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}