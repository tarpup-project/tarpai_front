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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  useEffect(() => {
    // Allow unauthenticated access - just fetch the status
    fetchStatus();
    // Reset caption expansion when status changes
    setIsCaptionExpanded(false);
  }, [statusId]);

  // Helper function to truncate text to approximately 2 lines (based on character count)
  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    
    // Find the last space before the max length to avoid cutting words
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0) {
      return text.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  // Helper function to check if text needs truncation
  const needsTruncation = (text: string, maxLength: number = 120) => {
    return text && text.length > maxLength;
  };

  // Helper function to render text with clickable links
  const renderTextWithLinks = (text: string, isInCaption = false) => {
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
            className={`${isInCaption ? 'text-white' : 'text-black'} underline hover:opacity-70 font-bold text-lg`}
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
      console.log('Fetching status with ID:', statusId);
      console.log('Current user:', user);
      console.log('Token exists:', !!localStorage.getItem('token'));
      
      const response = await api.get(`/status/${statusId}`);
      console.log('Status API response:', response.data);
      
      setStatus(response.data);
    } catch (error: any) {
      console.error('Failed to fetch status:', error);
      console.error('Error response:', error.response?.data);
      
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
    console.log('handleLike called');
    console.log('status:', status);
    console.log('user:', user);
    console.log('token:', localStorage.getItem('token'));
    
    if (!status) {
      console.log('No status found');
      return;
    }
    
    // Check authentication
    const hasAuth = user && localStorage.getItem('token');
    
    if (!hasAuth) {
      console.log('No authentication - showing login modal');
      setShowLoginModal(true);
      return;
    }
    
    console.log('Making like API call to:', `/status/${status.id}/like`);
    
    try {
      const response = await api.post(`/status/${status.id}/like`);
      console.log('Like API response:', response.data);
      
      setStatus(prev => {
        if (!prev) return null;
        const newStatus = {
          ...prev,
          isLiked: !prev.isLiked,
          likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
        };
        console.log('Updated status:', newStatus);
        return newStatus;
      });
      
      toast.success(status.isLiked ? 'Unliked!' : 'Liked!');
    } catch (error: any) {
      console.error('Failed to like status:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to like status');
    }
  };

  const handleShare = () => {
    if (!status) return;
    const statusUrl = `${window.location.origin}/status/${status.id}`;
    const shareText = `Check out this status from ${status.author.name}`;
    
    if (navigator.share) {
      navigator.share({
        title: shareText,
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
      
      // Send verification link with status author as the profile user
      await publicApi.post('/auth/create-pending-profile-user', {
        name: signupName,
        email: signupEmail,
        profileUserId: status?.author._id,
        action: 'view_status',
        profileUsername: status?.author.username || status?.author.name,
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
      
      // If email already exists, send login link instead
      if (error.response?.data?.message?.includes('already exists') || 
          error.response?.data?.message?.includes('Email already')) {
        // Show password modal instead of directly sending login link
        setShowLoginModal(false);
        setShowPasswordModal(true);
      } else {
        toast.error(error.response?.data?.message || 'Failed to send verification email');
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!loginPassword.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoggingIn(true);

    try {
      const publicApi = (await import('@/lib/publicApi')).default;
      const setAuth = useAuthStore.getState().setAuth;

      // Login with email and password
      const response = await publicApi.post('/auth/login', {
        email: signupEmail,
        password: loginPassword,
      });

      if (response.data.token) {
        // User logged in successfully
        setAuth(response.data.user, response.data.token);
        
        // Close modal
        setShowPasswordModal(false);
        
        // Show success message
        toast.success('Logged in successfully!');
        
        // Reset states
        setSignupName('');
        setSignupEmail('');
        setLoginPassword('');
        
        // Refresh the page to update the UI
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to login:', error);
      if (error.response?.status === 401) {
        toast.error('Invalid password. Please try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to login');
      }
    } finally {
      setIsLoggingIn(false);
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
        className="min-h-screen w-full max-w-md mx-auto flex items-center justify-center"
        style={{ background: '#e6e6e6' }}
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
      className="min-h-screen w-full max-w-md mx-auto relative"
      style={{ background: '#e6e6e6' }}
    >
      {/* Check if status has images */}
      {status.images && status.images.length > 0 ? (
        <>
          {/* Status Images - Centered for small, scrollable for tall */}
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white" style={{ paddingBottom: '100px' }}>
            <div className="w-full min-h-screen flex flex-col items-center justify-center py-20">
              <div className="w-full max-w-md mx-auto">
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
          <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-3" style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 60%, rgba(255, 255, 255, 0) 100%)'
          }}>
            <div className="w-full max-w-md mx-auto flex items-center gap-3">
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
          </div>

          {/* Status Content and Actions - Fixed at bottom with gradient */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none" style={{
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(0, 0, 0, 0.4) 80%, rgba(0, 0, 0, 0) 100%)',
            paddingBottom: '80px' // Space for floating buttons
          }}>
            {/* Push caption to bottom */}
            <div className="flex flex-col justify-end h-full min-h-[200px]">
              <div className="w-full max-w-md mx-auto px-4 pb-4 pointer-events-auto">
                <div 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (needsTruncation(status.content)) {
                      setIsCaptionExpanded(!isCaptionExpanded);
                    }
                  }}
                >
                  <p className="text-white whitespace-pre-wrap text-xs" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', fontSize: '12px' }}>
                    {renderTextWithLinks(
                      isCaptionExpanded || !needsTruncation(status.content) 
                        ? status.content 
                        : truncateText(status.content), 
                      true
                    )}
                  </p>
                </div>

                {/* Repost Buttons - Only show if not the author and not already reposted */}
                {status.author._id !== user?.id && !status.isReposted && (
                  <div className="space-y-2 mt-4">
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
        </>
      ) : (
        <>
          {/* Text-only or Link Preview - Centered Layout */}
          {/* Author Info - Fixed at top */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white p-4 border-b border-gray-200">
            <div className="w-full max-w-md mx-auto flex items-center gap-3">
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
          </div>

          {/* Centered Content */}
          <div className="absolute inset-0 overflow-y-auto pt-20 px-6" style={{ paddingBottom: '200px' }}>
            <div className="max-w-md w-full mx-auto flex items-center justify-center min-h-full">
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
                /* Text-only - Centered with dynamic size and scrollable for long content */
                (() => {
                  const wordCount = status.content ? status.content.trim().split(/\s+/).length : 0;
                  const isLongContent = wordCount > 300;
                  const isShortContent = status.content && status.content.length < 100;
                  
                  if (isLongContent) {
                    return (
                      <div className="overflow-y-auto px-4" style={{ maxHeight: 'calc(100vh - 200px)', paddingBottom: '100px' }}>
                        <p 
                          className="text-black text-left whitespace-pre-wrap break-words"
                          style={{ fontSize: '11px', lineHeight: '1.4' }}
                        >
                          {renderTextWithLinks(status.content)}
                        </p>
                      </div>
                    );
                  } else {
                    return (
                      <p 
                        className={`text-black text-center whitespace-pre-wrap ${
                          isShortContent ? 'text-4xl' : 'text-xl'
                        }`}
                      >
                        {renderTextWithLinks(status.content)}
                      </p>
                    );
                  }
                })()
              )}
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 pointer-events-none" style={{ 
            paddingBottom: '80px', // Space for floating buttons
            paddingTop: '16px'
          }}>
            <div className="w-full max-w-md mx-auto px-4 pointer-events-auto">
              {/* Repost Buttons - Only show if not the author and not already reposted */}
              {status.author._id !== user?.id && !status.isReposted && (
                <div>
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
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-6">
        <div className="w-full max-w-md mx-auto flex justify-between items-center">
          {/* Like and Share Buttons Group */}
          <div className="flex items-center gap-4 pl-4">
            {/* Like Button */}
            <button
              onClick={() => {
                console.log('Floating like button clicked!');
                handleLike();
              }}
              className="flex items-center gap-1.5 hover:scale-110 transition"
            >
              <svg 
                className={`w-6 h-6 ${status?.isLiked ? 'fill-red-500 text-red-500' : `fill-none ${status.images && status.images.length > 0 ? 'text-white' : 'text-black'}`} drop-shadow-lg`}
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className={`${status.images && status.images.length > 0 ? 'text-white' : 'text-black'} font-medium text-base drop-shadow-lg`}>{status?.likesCount || 0}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={() => {
                console.log('Floating share button clicked!');
                handleShare();
              }}
              className="hover:scale-110 transition"
            >
              <svg className={`w-6 h-6 ${status.images && status.images.length > 0 ? 'text-white' : 'text-black'} drop-shadow-lg`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          {/* Home Button */}
          <div className="pr-4">
            <button
              onClick={() => router.push('/')}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
            >
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-6" onClick={() => {
          setShowPasswordModal(false);
          setLoginPassword('');
        }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setLoginPassword('');
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-black mb-2">Welcome back!</h2>
                <p className="text-gray-600">Enter your password to continue</p>
                <p className="text-sm text-gray-500 mt-2">{signupEmail}</p>
              </div>

              <div>
                <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="loginPassword"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-300 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="Enter your password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordLogin();
                    }
                  }}
                />
              </div>

              <button
                onClick={handlePasswordLogin}
                disabled={isLoggingIn}
                className="w-full bg-pink-500 text-white hover:bg-pink-600 py-3 rounded-full font-semibold transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </button>

              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-sm text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              <button
                onClick={() => {
                  // Store the context in localStorage before redirecting to Google OAuth
                  const context = {
                    action: 'view_status',
                    statusId: statusId,
                    returnUrl: window.location.pathname
                  };
                  localStorage.setItem('googleOAuthContext', JSON.stringify(context));
                  
                  // Redirect to Google OAuth on the backend server
                  window.location.href = 'http://localhost:3000/auth/google';
                }}
                className="w-16 h-16 mx-auto bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-gray-400 transition shadow-sm"
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setShowLoginModal(true);
                    setLoginPassword('');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to signup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
