'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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

export default function StatusDetailPage() {
  const router = useRouter();
  const params = useParams();
  const statusId = params.statusId as string;
  const user = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  useEffect(() => {
    // Allow unauthenticated access - just fetch the status
    fetchStatus();
  }, [statusId]);

  // Helper function to render text with clickable links
  const renderTextWithLinks = (text: string) => {
    if (!text) return text;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black underline hover:text-gray-700 font-bold text-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

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
    
    // Check authentication
    const hasAuth = user && localStorage.getItem('token');
    
    if (!hasAuth) {
      console.log('No authentication - showing login modal');
      setShowLoginModal(true);
      return;
    }
    
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
    
    // Check authentication
    const hasAuth = user && localStorage.getItem('token');
    
    if (!hasAuth) {
      console.log('No authentication - showing login modal');
      setShowLoginModal(true);
      return;
    }
    
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

  const handleSignupSubmit = async () => {
    if (!signupName.trim() || !signupEmail.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      toast.error('Please enter a valid email');
      return;
    }
    
    setIsCreatingAccount(true);
    
    try {
      const publicApi = (await import('@/lib/publicApi')).default;
      
      // Send verification link
      await publicApi.post('/auth/create-pending-profile-user', {
        name: signupName,
        email: signupEmail,
        action: 'view_status',
        statusId: statusId,
      });
      
      // Close modal and show success message
      setShowLoginModal(false);
      toast.success('Verification email sent! Please check your email to complete the action.');
      
      // Reset
      setSignupName('');
      setSignupEmail('');
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      toast.error(error.response?.data?.message || 'Failed to send verification email');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (loading) {
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
      {/* Check if status has images */}
      {status.images && status.images.length > 0 ? (
        <>
          {/* Status Images - Centered for small, scrollable for tall */}
          <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-white">
            <div className="w-full min-h-screen flex flex-col items-center justify-center py-20">
              <div className="w-full">
                {status.images.map((image, index) => (
                  <div key={index} className="w-full">
                    <Image
                      src={image}
                      alt={`Status image ${index + 1}`}
                      width={1200}
                      height={1200}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Author Info - Fixed at top with gradient */}
          <div className="fixed top-0 left-0 right-0 z-10 p-4 flex items-center gap-3" style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 60%, rgba(255, 255, 255, 0) 100%)'
          }}>
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition"
              onClick={() => {
                if (status.author.username) {
                  router.push(`/${status.author.username}`);
                }
              }}
            >
              <Image
                src={status.author.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                alt={status.author.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
              />
              <div>
                <h3 className="font-semibold text-black" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.8)' }}>{status.author.name}</h3>
                {status.author.username && (
                  <p className="text-sm text-gray-700" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.8)' }}>@{status.author.username}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="text-gray-700 hover:text-gray-900"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Content and Actions - Fixed at bottom with gradient */}
          <div className="fixed bottom-0 left-0 right-0 z-10" style={{
            background: 'linear-gradient(to top, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.65) 60%, rgba(255, 255, 255, 0) 100%)'
          }}>
            <div className="p-4">
              <p className="text-black mb-4 whitespace-pre-wrap" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
                {renderTextWithLinks(status.content)}
              </p>

              {/* Link Preview Card - Only show if no images */}
              {status.linkPreview && (!status.images || status.images.length === 0) && (
                <a
                  href={status.linkPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-90 transition mb-4"
                >
                  {status.linkPreview.image && status.linkPreview.image.trim() !== '' && (
                    <div className="w-full h-40 overflow-hidden bg-gray-200">
                      <Image
                        src={status.linkPreview.image}
                        alt={status.linkPreview.title || 'Link preview'}
                        width={400}
                        height={200}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 mt-0.5 flex-shrink-0">
                        {status.linkPreview.favicon && status.linkPreview.favicon.trim() !== '' ? (
                          <Image
                            src={status.linkPreview.favicon}
                            alt="favicon"
                            width={16}
                            height={16}
                            className="w-4 h-4"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {status.linkPreview.siteName && (
                          <p className="text-xs mb-1 text-gray-600">
                            {status.linkPreview.siteName}
                          </p>
                        )}
                        {status.linkPreview.title && (
                          <p className="text-sm font-semibold mb-1 line-clamp-2 text-gray-900">
                            {status.linkPreview.title}
                          </p>
                        )}
                        {status.linkPreview.description && (
                          <p className="text-xs line-clamp-2 text-gray-600">
                            {status.linkPreview.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              )}

          {/* Like and Share */}
          <div className="flex items-center gap-6 mb-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-2"
            >
              <svg 
                className={`w-6 h-6 ${status.isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-700'}`}
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-black font-medium">{status.likesCount}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {/* Repost Buttons - Only show if not the author and not already reposted */}
          {status.author._id !== user?.id && !status.isReposted && (
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
        </>
      ) : (
        <>
          {/* Text-only or Link Preview - Centered Layout */}
          {/* Author Info - Fixed at top */}
          <div className="fixed top-0 left-0 right-0 z-10 bg-white p-4 flex items-center gap-3 border-b border-gray-200">
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition"
              onClick={() => {
                if (status.author.username) {
                  router.push(`/${status.author.username}`);
                }
              }}
            >
              <Image
                src={status.author.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                alt={status.author.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-black">{status.author.name}</h3>
                {status.author.username && (
                  <p className="text-sm text-gray-500">@{status.author.username}</p>
                )}
              </div>
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

          {/* Centered Content */}
          <div className="fixed inset-0 flex items-center justify-center pt-20 pb-32 px-6">
            <div className="max-w-2xl w-full">
              {status.linkPreview ? (
                <div className="space-y-4">
                  {/* Link Preview Card - Centered */}
                  <a
                    href={status.linkPreview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden border border-gray-200 bg-white hover:opacity-90 transition shadow-lg"
                  >
                    {status.linkPreview.image && status.linkPreview.image.trim() !== '' && (
                      <div className="w-full h-64 overflow-hidden bg-gray-200">
                        <Image
                          src={status.linkPreview.image}
                          alt={status.linkPreview.title || 'Link preview'}
                          width={600}
                          height={400}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 mt-1 flex-shrink-0">
                          {status.linkPreview.favicon && status.linkPreview.favicon.trim() !== '' ? (
                            <Image
                              src={status.linkPreview.favicon}
                              alt="favicon"
                              width={24}
                              height={24}
                              className="w-6 h-6"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {status.linkPreview.siteName && (
                            <p className="text-sm mb-2 text-gray-600">
                              {status.linkPreview.siteName}
                            </p>
                          )}
                          {status.linkPreview.title && (
                            <p className="text-xl font-bold mb-2 text-gray-900">
                              {status.linkPreview.title}
                            </p>
                          )}
                          {status.linkPreview.description && (
                            <p className="text-base text-gray-600">
                              {status.linkPreview.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                  
                  {/* Caption below link preview if exists */}
                  {status.content && status.content.trim() && (
                    <p className="text-black text-left whitespace-pre-wrap text-lg px-4 break-words">
                      {renderTextWithLinks(status.content)}
                    </p>
                  )}
                </div>
              ) : (
                /* Text-only - Centered with dynamic size */
                <p 
                  className={`text-black text-center whitespace-pre-wrap ${
                    status.content && status.content.length < 100 ? 'text-4xl' : 'text-xl'
                  }`}
                >
                  {renderTextWithLinks(status.content)}
                </p>
              )}
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 p-4">
            {/* Like and Share */}
            <div className="flex items-center justify-center gap-8 mb-4">
              <button
                onClick={handleLike}
                className="flex items-center gap-2"
              >
                <svg 
                  className={`w-7 h-7 ${status.isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-700'}`}
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-black font-medium text-lg">{status.likesCount}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>

            {/* Repost Buttons - Only show if not the author and not already reposted */}
            {status.author._id !== user?.id && !status.isReposted && (
              <div className="max-w-md mx-auto">
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
        </>
      )}

      {/* Floating Home Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition z-20"
      >
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-6" onClick={() => {
          console.log('Modal backdrop clicked - closing modal');
          setShowLoginModal(false);
        }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                console.log('Modal close button clicked');
                setShowLoginModal(false);
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <div className="space-y-4">
              <div>
                <label htmlFor="loginName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="loginName"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-300 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="Enter your firstname"
                />
              </div>

              <div>
                <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="loginEmail"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-300 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="Enter your email"
                />
              </div>

              <button
                onClick={handleSignupSubmit}
                disabled={isCreatingAccount}
                className="w-full bg-pink-500 text-white hover:bg-pink-600 py-3 rounded-full font-semibold transition disabled:opacity-50"
              >
                {isCreatingAccount ? 'Creating account...' : 'Continue'}
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-pink-500 hover:text-pink-600 font-semibold"
                >
                  Log in
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
