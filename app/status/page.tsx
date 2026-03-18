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
import ImageCropper from '@/components/ImageCropper';
import EditRepostModal from '@/components/EditRepostModal';
import LikesModal from '@/components/LikesModal';

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

interface GroupedStatus {
  author: {
    _id: string;
    name: string;
    avatar: string;
    username?: string;
  };
  statuses: Status[];
  latestTime: string;
}

interface StatusDetail extends Status {
  // Additional fields that might come from the detail endpoint
}

export default function StatusPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [statuses, setStatuses] = useState<GroupedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<GroupedStatus | null>(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStatusContent, setNewStatusContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [currentCroppingIndex, setCurrentCroppingIndex] = useState<number | null>(null);
  const [currentFileToAdd, setCurrentFileToAdd] = useState<File | null>(null);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [selectedStatusForLikes, setSelectedStatusForLikes] = useState<string | null>(null);
  const [selectedStatusLikesCount, setSelectedStatusLikesCount] = useState(0);

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

  const fetchStatuses = async () => {
    try {
      const response = await api.get('/status/feed');
      console.log('Raw statuses from API:', response.data);
      
      // Group statuses by author
      const grouped = response.data.reduce((acc: any, status: Status) => {
        const authorId = status.author._id;
        if (!acc[authorId]) {
          acc[authorId] = {
            author: status.author,
            statuses: [],
            latestTime: status.createdAt,
          };
        }
        acc[authorId].statuses.push(status);
        // Update latest time if this status is newer
        if (new Date(status.createdAt) > new Date(acc[authorId].latestTime)) {
          acc[authorId].latestTime = status.createdAt;
        }
        return acc;
      }, {});
      
      // Convert to array and sort: current user first, then by latest status time
      const groupedArray = Object.values(grouped).sort((a: any, b: any) => {
        // Current user's statuses always come first
        if (a.author._id === user?.id) return -1;
        if (b.author._id === user?.id) return 1;
        // Otherwise sort by latest time
        return new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime();
      }) as GroupedStatus[];
      
      console.log('Grouped statuses:', groupedArray);
      setStatuses(groupedArray);
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
      toast.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (statusId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Find the status to check if user is the author
    let targetStatus: Status | null = null;
    for (const group of statuses) {
      const found = group.statuses.find(s => s.id === statusId);
      if (found) {
        targetStatus = found;
        break;
      }
    }
    
    // If user is the author, show likes modal instead of liking
    if (targetStatus && targetStatus.author._id === user?.id) {
      setSelectedStatusForLikes(statusId);
      setSelectedStatusLikesCount(targetStatus.likesCount);
      setShowLikesModal(true);
      return;
    }
    
    try {
      await api.post(`/status/${statusId}/like`);
      
      // Update in grouped statuses
      setStatuses(prev => prev.map(group => ({
        ...group,
        statuses: group.statuses.map(status =>
          status.id === statusId
            ? { ...status, isLiked: !status.isLiked, likesCount: status.isLiked ? status.likesCount - 1 : status.likesCount + 1 }
            : status
        )
      })));
      
      // Update in selected group
      if (selectedStatusGroup) {
        setSelectedStatusGroup(prev => prev ? ({
          ...prev,
          statuses: prev.statuses.map(status =>
            status.id === statusId
              ? { ...status, isLiked: !status.isLiked, likesCount: status.isLiked ? status.likesCount - 1 : status.likesCount + 1 }
              : status
          )
        }) : null);
      }
    } catch (error) {
      console.error('Failed to like status:', error);
      toast.error('Failed to like status');
    }
  };

  const handleShare = (status: Status | StatusDetail) => {
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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(statusUrl).then(() => {
        toast.success('Status link copied to clipboard!');
      }).catch((error) => {
        console.error('Failed to copy:', error);
        toast.error('Failed to copy link');
      });
    }
  };

  const handleStatusGroupClick = (group: GroupedStatus) => {
    setSelectedStatusGroup(group);
    setCurrentStatusIndex(0);
    setShowStatusModal(true);
    setShowControls(true); // Reset controls visibility when opening modal
  };

  const handleNextStatus = () => {
    if (selectedStatusGroup && currentStatusIndex < selectedStatusGroup.statuses.length - 1) {
      setCurrentStatusIndex(prev => prev + 1);
    }
  };

  const handlePrevStatus = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(prev => prev - 1);
    }
  };

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  const getCurrentStatus = (): Status | null => {
    if (!selectedStatusGroup) return null;
    return selectedStatusGroup.statuses[currentStatusIndex];
  };

  const handleRepostNow = async () => {
    const currentStatus = getCurrentStatus();
    if (!currentStatus) return;
    try {
      await api.post(`/status/${currentStatus.id}/repost`);
      toast.success('Reposted successfully!');
      setShowStatusModal(false);
      fetchStatuses();
    } catch (error: any) {
      console.error('Failed to repost:', error);
      const errorMessage = error.response?.data?.message || 'Failed to repost';
      toast.error(errorMessage);
    }
  };

  const handleEditRepost = () => {
    setShowStatusModal(false);
    setShowRepostModal(true);
  };

  const handleConfirmRepost = async () => {
    const currentStatus = getCurrentStatus();
    if (!currentStatus) return;
    try {
      fetchStatuses();
    } catch (error) {
      console.error('Failed to repost:', error);
      toast.error('Failed to repost');
    }
  };

  const handleDeleteStatus = async () => {
    const currentStatus = getCurrentStatus();
    if (!currentStatus) return;
    if (!confirm('Are you sure you want to delete this status?')) return;
    
    try {
      await api.delete(`/status/${currentStatus.id}`);
      toast.success('Status deleted successfully!');
      setShowStatusModal(false);
      fetchStatuses();
    } catch (error) {
      console.error('Failed to delete status:', error);
      toast.error('Failed to delete status');
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if already has an image
    if (selectedImages.length >= 1) {
      toast.error('You can only upload 1 image per status');
      return;
    }

    // Only process the first file
    const file = files[0];
    setCurrentFileToAdd(file); // Store the original file
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCurrentCroppingIndex(selectedImages.length);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage: Blob) => {
    // Convert blob to file
    const file = new File([croppedImage], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    setSelectedImages(prev => [...prev, file]);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedImage);
    setImagePreviewUrls(prev => [...prev, previewUrl]);
    
    // Close cropper
    setShowCropper(false);
    setImageToCrop(null);
    setCurrentCroppingIndex(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    setCurrentCroppingIndex(null);
    setCurrentFileToAdd(null);
  };

  const handleSkipCrop = () => {
    // Use the original file without cropping
    if (currentFileToAdd) {
      setSelectedImages(prev => [...prev, currentFileToAdd]);
      
      // Create preview URL from original file
      const previewUrl = URL.createObjectURL(currentFileToAdd);
      setImagePreviewUrls(prev => [...prev, previewUrl]);
    }
    
    // Close cropper
    setShowCropper(false);
    setImageToCrop(null);
    setCurrentCroppingIndex(null);
    setCurrentFileToAdd(null);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to count words
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleCreateStatus = async () => {
    if (!newStatusContent.trim() && selectedImages.length === 0) {
      toast.error('Please add some content or images');
      return;
    }

    // Check word limit when images are present
    if (selectedImages.length > 0 && !!newStatusContent.trim()) {
      const wordCount = countWords(newStatusContent);
      if (wordCount > 30) {
        toast.error('Caption must be 30 words or less when images are uploaded');
        return;
      }
    }

    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', newStatusContent);
      
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      await api.post('/status', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Status posted successfully!');
      setShowCreateModal(false);
      setNewStatusContent('');
      setSelectedImages([]);
      setImagePreviewUrls([]);
      fetchStatuses();
    } catch (error) {
      console.error('Failed to create status:', error);
      toast.error('Failed to post status');
    } finally {
      setIsPosting(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = async (userId: string) => {
    setShowSearchResults(false);
    
    // Find the selected user to display their name
    const selectedUser = searchResults.find(u => u.id === userId);
    if (selectedUser) {
      setSearchQuery(selectedUser.name);
    }
    
    setLoading(true);
    
    try {
      const response = await api.get(`/status/user/${userId}`);
      // Group the user's statuses
      const grouped = [{
        author: response.data[0]?.author || selectedUser,
        statuses: response.data,
        latestTime: response.data[0]?.createdAt || new Date().toISOString(),
      }];
      setStatuses(grouped);
    } catch (error) {
      console.error('Failed to fetch user statuses:', error);
      toast.error('Failed to load user statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    fetchStatuses();
  };

  const getImageLayout = (images: string[]) => {
    const count = images.length;
    if (count === 1) return 'single';
    if (count === 2) return 'double';
    if (count === 3) return 'triple';
    return 'quad';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show loading while checking authentication
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
        background
          ? {
              background: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }
          : theme === 'light'
          ? {
              background: '#e6e6e6',
            }
          : theme === 'dark'
          ? {
              background: '#000000',
            }
          : {
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            }
      }
    >
      {/* Overlay */}
      {background && (
        <div className="hidden md:block absolute inset-0 bg-black/20 backdrop-blur-md"></div>
      )}

      {/* Phone container with blur effect */}
      <div className="relative z-10 flex items-start justify-center min-h-screen w-full">
        {/* Blurred background edges - hidden on mobile */}
        <div 
          className="hidden md:block absolute inset-0 backdrop-blur-xl"
          style={{ 
            maskImage: 'radial-gradient(white 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(white 30%, transparent 70%)'
          }}
        />
        
        {/* Phone container */}
        <div 
          className={`relative w-full md:max-w-md h-screen md:h-[calc(100vh-2rem)] md:my-4 mx-0 md:mx-4 rounded-none md:rounded-3xl overflow-hidden flex flex-col ${
            theme === 'light' 
              ? 'bg-white/90 shadow-2xl' 
              : theme === 'dark'
              ? 'bg-black/80 shadow-2xl'
              : 'bg-black/30 backdrop-blur-md shadow-2xl'
          }`}
        >
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
          {/* Content */}
          <div className="relative z-10 flex flex-col min-h-0">
        {/* Header */}
        <AppHeader />

        {/* Search Bar */}
        <div className="px-2 py-4 relative">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className={`w-full ${theme === 'light' ? 'bg-white/40 text-black placeholder-gray-600' : 'bg-white/10 border border-white/30 text-white placeholder-gray-400'} backdrop-blur-md rounded-full pl-12 pr-12 py-3 focus:outline-none focus:ring-2 ${theme === 'light' ? 'focus:ring-gray-300' : 'focus:ring-white/20'}`}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className={`absolute top-full left-2 right-2 mt-2 ${theme === 'light' ? 'bg-white/90' : 'bg-black/90'} backdrop-blur-md rounded-2xl shadow-lg max-h-80 overflow-y-auto z-20`}>
              {isSearching ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-white/10'} transition`}
                    >
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 text-left">
                        <p className={`font-semibold ${theme === 'light' ? 'text-black' : 'text-white'}`}>{user.name}</p>
                        <p className="text-sm text-gray-400">@{user.username || 'user'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Feed - Grid Layout */}
        <div className="flex-1 px-2 pb-32 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {statuses.map((group) => {
              const firstStatus = group.statuses[0];
              const statusCount = group.statuses.length;
              const hasImage = firstStatus.images && firstStatus.images.length > 0;
              
              return (
                <div
                  key={group.author._id}
                  onClick={() => handleStatusGroupClick(group)}
                  className={`flex flex-col ${theme === 'light' ? 'bg-white/40' : 'bg-white/10 border border-white/30'} backdrop-blur-md rounded-2xl overflow-hidden relative cursor-pointer hover:scale-[1.02] transition`}
                >
                  {/* First Status Image - Only show if image exists */}
                  {hasImage && (
                    <div className="relative">
                      <Image
                        src={firstStatus.images[0]}
                        alt="Status"
                        width={400}
                        height={400}
                        className="w-full h-64 object-cover"
                      />
                      
                      {/* Status count indicator */}
                      {statusCount > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium">{statusCount}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content and Author Info - Flex grow to push author to bottom */}
                  <div className="flex flex-col flex-1 p-3">
                    {/* Show count badge for text-only statuses */}
                    {!hasImage && statusCount > 1 && (
                      <div className="flex justify-end mb-2">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium">{statusCount}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Content - grows to fill space */}
                    {firstStatus.content && (
                      <p className="text-sm mb-2 line-clamp-2 whitespace-pre-wrap flex-1">{firstStatus.content}</p>
                    )}
                    
                    {/* Author Info - stays at bottom */}
                    <div className="flex items-center gap-2 mt-auto">
                      <Image
                        src={group.author.avatar}
                        alt={group.author.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs font-medium">{group.author.username || group.author.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {statuses.length === 0 && (
            <div className="text-center py-12">
              <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>No statuses yet</p>
            </div>
          )}
        </div>

        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6 pointer-events-none z-20">
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
          >
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Create Status Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">New Status</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Editor */}
            <div className="mb-4">
              <textarea
                value={newStatusContent}
                onChange={(e) => setNewStatusContent(e.target.value)}
                className="w-full bg-gray-50 text-black rounded-2xl p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none text-base"
                placeholder="What's on your mind?"
              />
              {/* Word count indicator when images are present */}
              {selectedImages.length > 0 && !!newStatusContent.trim() && (
                <div className="flex justify-between items-center mt-2 px-2">
                  <span className={`text-sm ${
                    countWords(newStatusContent) > 30 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {countWords(newStatusContent)}/30 words
                  </span>
                  {countWords(newStatusContent) > 30 && (
                    <span className="text-red-500 text-sm">Caption too long for images</span>
                  )}
                </div>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <Image
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      width={300}
                      height={300}
                      className="w-full h-24 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-gray-600 hover:text-gray-800 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={selectedImages.length >= 1}
                />
              </label>

              <button
                onClick={handleCreateStatus}
                disabled={
                  isPosting || 
                  (!newStatusContent.trim() && selectedImages.length === 0) ||
                  (selectedImages.length > 0 && !!newStatusContent.trim() && countWords(newStatusContent) > 30)
                }
                className="bg-gray-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPosting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Posting...
                  </>
                ) : (
                  <>
                    Post
                    <svg className="w-5 h-5 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Detail Modal - WhatsApp Style with Navigation */}
      {showStatusModal && selectedStatusGroup && getCurrentStatus() && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowStatusModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Indicators */}
            {showControls && (
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                {selectedStatusGroup.statuses.map((_, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-1 rounded-full ${
                      idx === currentStatusIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Navigation Arrows */}
            {showControls && currentStatusIndex > 0 && (
              <button
                onClick={handlePrevStatus}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm text-white rounded-full p-2 z-10 hover:bg-black/80"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {showControls && currentStatusIndex < selectedStatusGroup.statuses.length - 1 && (
              <button
                onClick={handleNextStatus}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm text-white rounded-full p-2 z-10 hover:bg-black/80"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedStatusGroup.author.username) {
                    setShowStatusModal(false);
                    router.push(`/${selectedStatusGroup.author.username}`);
                  }
                }}
              >
                <Image
                  src={selectedStatusGroup.author.avatar}
                  alt={selectedStatusGroup.author.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-black">{selectedStatusGroup.author.name}</p>
                  <p className="text-sm text-gray-500">@{selectedStatusGroup.author.username || 'user'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{getTimeAgo(getCurrentStatus()!.createdAt)}</span>
                {getCurrentStatus()!.author._id === user?.id && (
                  <button
                    onClick={handleDeleteStatus}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Images - Only show if images exist */}
            {getCurrentStatus()!.images && getCurrentStatus()!.images.length > 0 && (
              <div className="space-y-0" onClick={toggleControls}>
                {getCurrentStatus()!.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <Image
                      src={img}
                      alt={`Status image ${idx + 1}`}
                      width={600}
                      height={600}
                      className="w-full h-auto object-cover cursor-pointer"
                    />
                    {showControls && getCurrentStatus()!.images.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
                        {idx + 1}/{getCurrentStatus()!.images.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="p-4 cursor-pointer" onClick={toggleControls}>
              {(() => {
                const currentStatus = getCurrentStatus();
                if (!currentStatus) return null;
                
                return (
                  <>
                    <p className="text-black mb-4 whitespace-pre-wrap">
                      {renderTextWithLinks(currentStatus.content)}
                    </p>

                    {/* Link Preview Card - Only show if no images */}
                    {currentStatus.linkPreview && (!currentStatus.images || currentStatus.images.length === 0) && (
                      <a
                        href={currentStatus.linkPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-90 transition mb-4"
                      >
                        {currentStatus.linkPreview.image && currentStatus.linkPreview.image.trim() !== '' && (
                          <div className="w-full h-48 overflow-hidden bg-gray-200">
                            <Image
                              src={currentStatus.linkPreview.image}
                              alt={currentStatus.linkPreview.title || 'Link preview'}
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
                              {currentStatus.linkPreview.favicon && currentStatus.linkPreview.favicon.trim() !== '' ? (
                                <Image
                                  src={currentStatus.linkPreview.favicon}
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
                              {currentStatus.linkPreview.siteName && (
                                <p className="text-xs mb-1 text-gray-600">
                                  {currentStatus.linkPreview.siteName}
                                </p>
                              )}
                              {currentStatus.linkPreview.title && (
                                <p className="text-sm font-semibold mb-1 line-clamp-2 text-gray-900">
                                  {currentStatus.linkPreview.title}
                                </p>
                              )}
                              {currentStatus.linkPreview.description && (
                                <p className="text-xs line-clamp-2 text-gray-600">
                                  {currentStatus.linkPreview.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </a>
                    )}

                    {/* Like and Share */}
                    <div className="flex items-center gap-6 mb-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleLike(currentStatus.id)}
                        className="flex items-center gap-2"
                      >
                        <svg 
                          className={`w-6 h-6 ${currentStatus.isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-600'}`}
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-black font-medium">{currentStatus.likesCount}</span>
                      </button>
                      <button
                        onClick={() => handleShare(currentStatus)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>

                    {/* Repost Buttons - Only show if not the author and not already reposted */}
                    {currentStatus.author._id !== user?.id && !currentStatus.isReposted && (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={handleRepostNow}
                          className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Repost Now
                        </button>
                        <button
                          onClick={handleEditRepost}
                          className="w-full bg-white text-black border-2 border-gray-300 py-3 rounded-2xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit & Repost
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit & Repost Modal */}
      <EditRepostModal
        isOpen={showRepostModal}
        status={getCurrentStatus()}
        theme={theme}
        initialContent={getCurrentStatus()?.content}
        onClose={() => setShowRepostModal(false)}
        onSuccess={() => {
          setShowRepostModal(false);
          fetchStatuses();
        }}
      />

      {/* Image Cropper */}
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          onSkip={handleSkipCrop}
          aspect={4 / 3}
        />
      )}

      {/* Likes Modal */}
      <LikesModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        statusId={selectedStatusForLikes || ''}
        likesCount={selectedStatusLikesCount}
      />
    </div>
    </div>
    </div>
  );
}
