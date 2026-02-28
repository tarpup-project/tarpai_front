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

interface StatusDetail extends Status {
  // Additional fields that might come from the detail endpoint
}

export default function StatusPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<StatusDetail | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostContent, setRepostContent] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStatusContent, setNewStatusContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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
      const response = await api.get('/status/feed');
      setStatuses(response.data);
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
      toast.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (statusId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/status/${statusId}/like`);
      setStatuses(prev => prev.map(status => 
        status.id === statusId 
          ? { ...status, isLiked: !status.isLiked, likesCount: status.isLiked ? status.likesCount - 1 : status.likesCount + 1 }
          : status
      ));
      if (selectedStatus && selectedStatus.id === statusId) {
        setSelectedStatus(prev => prev ? {
          ...prev,
          isLiked: !prev.isLiked,
          likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1
        } : null);
      }
    } catch (error) {
      console.error('Failed to like status:', error);
      toast.error('Failed to like status');
    }
  };

  const handleStatusClick = async (statusId: string) => {
    try {
      const response = await api.get(`/status/${statusId}`);
      setSelectedStatus(response.data);
      setShowStatusModal(true);
    } catch (error) {
      console.error('Failed to fetch status details:', error);
      toast.error('Failed to load status');
    }
  };

  const handleRepostNow = async () => {
    if (!selectedStatus) return;
    try {
      await api.post(`/status/${selectedStatus.id}/repost`);
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
    if (!selectedStatus) return;
    setRepostContent(selectedStatus.content);
    setShowStatusModal(false);
    setShowRepostModal(true);
  };

  const handleConfirmRepost = async () => {
    if (!selectedStatus) return;
    try {
      const formData = new FormData();
      formData.append('content', repostContent);
      
      await api.post(`/status/${selectedStatus.id}/edit-repost`, formData);
      toast.success('Reposted with edits successfully!');
      setShowRepostModal(false);
      setRepostContent('');
      fetchStatuses();
    } catch (error) {
      console.error('Failed to repost:', error);
      toast.error('Failed to repost');
    }
  };

  const handleDeleteStatus = async () => {
    if (!selectedStatus) return;
    if (!confirm('Are you sure you want to delete this status?')) return;
    
    try {
      await api.delete(`/status/${selectedStatus.id}`);
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
    if (!files) return;

    const newFiles = Array.from(files);
    const totalImages = selectedImages.length + newFiles.length;

    if (totalImages > 4) {
      toast.error('You can only upload up to 4 images');
      return;
    }

    setSelectedImages(prev => [...prev, ...newFiles]);

    // Create preview URLs
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateStatus = async () => {
    if (!newStatusContent.trim() && selectedImages.length === 0) {
      toast.error('Please add some content or images');
      return;
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
      setStatuses(response.data);
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

        {/* Status Feed */}
        <div className="flex-1 px-2 pb-32 overflow-y-auto">
          <div className="columns-2 gap-3 space-y-3">
            {statuses.map((status) => {
              const layout = getImageLayout(status.images);
              const hasMultipleImages = status.images.length > 1;
              
              return (
                <div
                  key={status.id}
                  onClick={() => handleStatusClick(status.id)}
                  className={`break-inside-avoid mb-3 ${theme === 'light' ? 'bg-white/40' : 'bg-white/10 border border-white/30'} backdrop-blur-md rounded-2xl overflow-hidden relative cursor-pointer hover:scale-[1.02] transition`}
                >
                  {/* Images */}
                  <div className="relative">
                    {layout === 'single' && (
                      <Image
                        src={status.images[0]}
                        alt="Status"
                        width={400}
                        height={400}
                        className="w-full h-64 object-cover"
                      />
                    )}
                    {layout === 'double' && (
                      <div className="grid grid-cols-2 gap-0.5">
                        {status.images.slice(0, 2).map((img, idx) => (
                          <Image
                            key={idx}
                            src={img}
                            alt="Status"
                            width={200}
                            height={200}
                            className="w-full h-32 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    {layout === 'triple' && (
                      <div className="grid grid-cols-2 gap-0.5">
                        <Image
                          src={status.images[0]}
                          alt="Status"
                          width={200}
                          height={400}
                          className="w-full h-64 object-cover row-span-2"
                        />
                        <Image
                          src={status.images[1]}
                          alt="Status"
                          width={200}
                          height={200}
                          className="w-full h-32 object-cover"
                        />
                        <Image
                          src={status.images[2]}
                          alt="Status"
                          width={200}
                          height={200}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                    {layout === 'quad' && (
                      <div className="grid grid-cols-2 gap-0.5">
                        {status.images.slice(0, 4).map((img, idx) => (
                          <Image
                            key={idx}
                            src={img}
                            alt="Status"
                            width={200}
                            height={200}
                            className="w-full h-32 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Multiple images indicator */}
                    {hasMultipleImages && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">{status.images.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <p className="text-sm mb-2 line-clamp-2">{status.content}</p>
                    
                    {/* Author and Like */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Image
                          src={status.author.avatar}
                          alt={status.author.name}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium">{status.author.username || status.author.name}</span>
                      </div>
                      
                      <button
                        onClick={(e) => handleLike(status.id, e)}
                        className="flex items-center gap-1"
                      >
                        <svg 
                          className={`w-5 h-5 ${status.isLiked ? 'fill-red-500 text-red-500' : 'fill-none'}`}
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-xs">{status.likesCount}</span>
                      </button>
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

        {/* Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition z-20"
      >
        <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Create Status Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6"
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
            <textarea
              value={newStatusContent}
              onChange={(e) => setNewStatusContent(e.target.value)}
              className="w-full bg-gray-50 text-black rounded-2xl p-4 mb-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none text-base"
              placeholder="What's on your mind?"
            />

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <Image
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      width={300}
                      height={300}
                      className="w-full h-40 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
                <span className="font-medium">Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={selectedImages.length >= 4}
                />
              </label>

              <button
                onClick={handleCreateStatus}
                disabled={isPosting || (!newStatusContent.trim() && selectedImages.length === 0)}
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

      {/* Status Detail Modal */}
      {showStatusModal && selectedStatus && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowStatusModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Image
                  src={selectedStatus.author.avatar}
                  alt={selectedStatus.author.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-black">{selectedStatus.author.name}</p>
                  <p className="text-sm text-gray-500">@{selectedStatus.author.username || 'user'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{getTimeAgo(selectedStatus.createdAt)}</span>
                {selectedStatus.author._id === user?.id && (
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

            {/* Images */}
            {selectedStatus.images.length > 0 && (
              <div className="space-y-0">
                {selectedStatus.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <Image
                      src={img}
                      alt={`Status image ${idx + 1}`}
                      width={600}
                      height={600}
                      className="w-full h-auto object-cover"
                    />
                    {selectedStatus.images.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
                        {idx + 1}/{selectedStatus.images.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <p className="text-black mb-4">{selectedStatus.content}</p>

              {/* Like and Share */}
              <div className="flex items-center gap-6 mb-4">
                <button
                  onClick={() => handleLike(selectedStatus.id)}
                  className="flex items-center gap-2"
                >
                  <svg 
                    className={`w-6 h-6 ${selectedStatus.isLiked ? 'fill-red-500 text-red-500' : 'fill-none text-gray-600'}`}
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-black font-medium">{selectedStatus.likesCount}</span>
                </button>
                <button className="flex items-center gap-2 text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              {/* Repost Buttons - Only show if not the author */}
              {selectedStatus.author._id !== user?.id && (
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
            </div>
          </div>
        </div>
      )}

      {/* Edit & Repost Modal */}
      {showRepostModal && selectedStatus && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRepostModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Edit & Repost</h2>
              <button
                onClick={() => setShowRepostModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Editor */}
            <textarea
              value={repostContent}
              onChange={(e) => setRepostContent(e.target.value)}
              className="w-full bg-gray-100 text-black rounded-2xl p-4 mb-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
              placeholder="Add your thoughts..."
            />

            {/* Attachments */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">ATTACHMENTS</p>
              <div className="grid grid-cols-4 gap-2">
                {selectedStatus.images.map((img, idx) => (
                  <Image
                    key={idx}
                    src={img}
                    alt="Attachment"
                    width={100}
                    height={100}
                    className="w-full h-20 object-cover rounded-xl"
                  />
                ))}
              </div>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmRepost}
              className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Confirm Repost
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
