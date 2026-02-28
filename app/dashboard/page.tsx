'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import { getLinkIcon, getLinkIconBgColor } from '@/utils/linkIcons';
import { getBackgroundStyle, getTextColorClass } from '@/config/theme.config';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import ImageCropper from '@/components/ImageCropper';
import AvatarPreview from '@/components/AvatarPreview';

interface Link {
  _id: string;
  title: string;
  url: string;
  order: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [searchFollowers, setSearchFollowers] = useState('');
  const [searchFollowing, setSearchFollowing] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  
  // Search for friends state
  const [followingModalTab, setFollowingModalTab] = useState<'following' | 'search'>('following');
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [openLinkMenu, setOpenLinkMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [showEditLinkModal, setShowEditLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [editLinkForm, setEditLinkForm] = useState({ title: '', url: '' });
  const [editingLinkLoading, setEditingLinkLoading] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication immediately using localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
      setIsHydrated(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isHydrated || isCheckingAuth) return;
    
    if (user) {
      fetchUserData();
    }
  }, [user, isHydrated, isCheckingAuth]);

  const fetchUserData = async () => {
    try {
      console.log('Fetching follow counts and user data...');
      
      // Fetch follow counts and links
      const [followersRes, followingRes, linksRes] = await Promise.all([
        api.get('/follows/followers'),
        api.get('/follows/following'),
        api.get('/users/links/my'),
      ]);
      setFollowersCount(followersRes.data.followers?.length || 0);
      setFollowingCount(followingRes.data.following?.length || 0);
      setFollowers(followersRes.data.followers || []);
      setFollowing(followingRes.data.following || []);
      setLinks(linksRes.data.links || []);
      
      // Optionally refresh user profile data
      try {
        const userResponse = await api.get(`/users/${user?.id}`);
        const userData = userResponse.data;
        
        // Update the store with latest user data
        updateUser({
          bio: userData.bio,
          displayName: userData.displayName,
          username: userData.username,
          avatar: userData.avatar,
        });
        
        // Don't update form state here - only update when modal opens
        // This prevents clearing user input while they're typing
      } catch (userError) {
        console.log('Could not refresh user data, using cached data');
      }
    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Show cropper instead of directly setting the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarToCrop(reader.result as string);
        setShowAvatarCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(croppedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    
    // Close cropper
    setShowAvatarCropper(false);
    setAvatarToCrop(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarSkipCrop = () => {
    // Use the original image without cropping
    if (avatarToCrop) {
      // Convert data URL back to file
      fetch(avatarToCrop)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          setAvatarFile(file);
          setAvatarPreview(avatarToCrop);
          setShowAvatarCropper(false);
          setAvatarToCrop(null);
          
          // Clear file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        });
    }
  };

  const handleAvatarCropCancel = () => {
    setShowAvatarCropper(false);
    setAvatarToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditProfile = () => {
    // Initialize form with current user data when modal opens
    setDisplayName(user?.displayName || '');
    setUsername(user?.username || '');
    setBio(user?.bio || '');
    setAvatarPreview(user?.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png');
    setAvatarFile(null);
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setEditLoading(true);

    try {
      // Update profile info
      const profileData = {
        displayName,
        username,
        bio,
      };

      await api.patch('/users/profile/info', profileData);

      // Upload avatar if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const avatarResponse = await api.post('/users/profile/avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        updateUser({
          displayName,
          username,
          bio,
          avatar: avatarResponse.data.user.avatar,
        });
      } else {
        updateUser({
          displayName,
          username,
          bio,
        });
      }

      toast.success('Profile updated successfully!');
      setShowEditModal(false);
      setAvatarFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkTitle || !newLinkUrl) {
      toast.error('Please fill in both title and URL');
      return;
    }

    setAddingLink(true);
    try {
      await api.post('/users/links', {
        title: newLinkTitle,
        url: newLinkUrl,
      });

      toast.success('Link added successfully!');
      setNewLinkTitle('');
      setNewLinkUrl('');
      setShowAddLinkModal(false);

      // Refresh links
      const linksRes = await api.get('/users/links/my');
      setLinks(linksRes.data.links || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add link');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await api.delete(`/users/links/${linkId}`);
      toast.success('Link deleted successfully!');

      // Refresh links
      const linksRes = await api.get('/users/links/my');
      setLinks(linksRes.data.links || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete link');
    }
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setEditLinkForm({ title: link.title, url: link.url });
    setShowEditLinkModal(true);
  };

  const handleUpdateLink = async () => {
    if (!editingLink || !editLinkForm.title || !editLinkForm.url) {
      toast.error('Please fill in both title and URL');
      return;
    }

    setEditingLinkLoading(true);
    try {
      await api.patch(`/users/links/${editingLink._id}`, {
        title: editLinkForm.title,
        url: editLinkForm.url,
      });

      toast.success('Link updated successfully!');
      setShowEditLinkModal(false);
      setEditingLink(null);
      setEditLinkForm({ title: '', url: '' });

      // Refresh links
      const linksRes = await api.get('/users/links/my');
      setLinks(linksRes.data.links || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update link');
    } finally {
      setEditingLinkLoading(false);
    }
  };

  const handleReorderLink = async (linkId: string) => {
    try {
      await api.patch(`/users/links/${linkId}/reorder`);

      toast.success('Link moved to top!');

      // Refresh links
      const linksRes = await api.get('/users/links/my');
      setLinks(linksRes.data.links || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder link');
    }
  };

  const handleOpenAppearance = () => {
    router.push('/appearance');
  };

  const handleOpenShare = async () => {
    router.push('/share-profile');
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingBroadcast(true);
    try {
      if (selectedFollowers.length > 0) {
        // Send to selected followers
        await api.post('/broadcasts/selected', {
          message: broadcastMessage,
          userIds: selectedFollowers,
        });
      } else {
        // Send to all followers
        await api.post('/broadcasts', {
          message: broadcastMessage,
          recipientType: 'followers',
        });
      }

      toast.success('Broadcast sent successfully!');
      setBroadcastMessage('');
      setSelectedFollowers([]);
      setShowBroadcastModal(false);
      setShowFollowersModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const toggleFollowerSelection = (followerId: string) => {
    setSelectedFollowers(prev => {
      if (prev.includes(followerId)) {
        return prev.filter(id => id !== followerId);
      } else {
        return [...prev, followerId];
      }
    });
  };

  const handleOpenBroadcast = () => {
    setShowBroadcastModal(true);
  };

  const searchForUsers = async () => {
    setSearchLoading(true);
    try {
      // Always load all users since we're doing client-side filtering
      const response = await api.get('/users');
      
      // Get current following IDs
      const followingIds = following.map(f => f._id || f.id);
      
      // Filter out current user and users already being followed
      const filteredUsers = response.data.filter((u: any) => {
        const userId = u.id || u._id;
        const isCurrentUser = userId === user?.id;
        const isAlreadyFollowing = followingIds.includes(userId);
        
        return !isCurrentUser && !isAlreadyFollowing;
      });
      
      setSearchUsers(filteredUsers);
      setUsersLoaded(true);
    } catch (error) {
      console.error('Failed to search users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Load all users when switching to search tab (initial load only)
  useEffect(() => {
    if (followingModalTab === 'search' && showFollowingModal && !usersLoaded) {
      searchForUsers();
    }
  }, [followingModalTab, showFollowingModal, usersLoaded]);

  const handleFollowUser = async (userId: string) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    try {
      await api.post(`/follows/${userId}`);
      toast.success('User followed successfully!');
      
      // Refresh following list
      const followingRes = await api.get('/follows/following');
      const newFollowing = followingRes.data.following || [];
      setFollowing(newFollowing);
      setFollowingCount(newFollowing.length);
      
      // Remove the followed user from search results immediately
      setSearchUsers(prev => prev.filter(u => {
        const userIdInList = u.id || u._id;
        return userIdInList !== userId;
      }));
    } catch (error: any) {
      console.error('Follow error:', error);
      toast.error(error.response?.data?.message || 'Failed to follow user');
    }
  };

  const handleUnfollowUser = async (userId: string) => {
    try {
      await api.delete(`/follows/${userId}`);
      toast.success('User unfollowed successfully!');
      
      // Refresh following list
      const followingRes = await api.get('/follows/following');
      const newFollowing = followingRes.data.following || [];
      setFollowing(newFollowing);
      setFollowingCount(newFollowing.length);
      
      // If we're on the search tab, refresh the search results to include the unfollowed user
      if (followingModalTab === 'search') {
        // Small delay to ensure following state is updated
        setTimeout(() => {
          searchForUsers();
        }, 100);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unfollow user');
    }
  };

  if (!isHydrated || !user || loading) {
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
      className={`min-h-screen relative overflow-hidden ${getTextColorClass(theme)}`}
      style={getBackgroundStyle(theme, background)}
    >
      {/* Overlay for better text readability - only for background theme */}
      {theme === 'background' && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <AppHeader />

        {/* Profile Section */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 pb-32 pt-4">
          {/* Avatar with Camera Button */}
          <div className="relative mb-4">
            <div 
              onClick={() => setShowAvatarPreview(true)}
              className={`w-28 h-28 rounded-full border-4 overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition ${
                theme === 'light' ? 'border-white' : 'border-white/20'
              }`}
            >
              <Image
                src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                alt={user.displayName || user.name}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png';
                }}
              />
            </div>
            <button 
              onClick={handleEditProfile}
              className={`absolute bottom-0 right-0 w-12 h-12 rounded-full flex items-center justify-center transition ${
                theme === 'light' 
                  ? 'bg-white/60 backdrop-blur-md border border-gray-300 shadow-md text-gray-700 hover:bg-white/70' 
                  : 'bg-black/60 backdrop-blur-md text-white hover:bg-black/80'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Name and Username */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{user.displayName || user.name}</h1>
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <button onClick={handleEditProfile} className={`${theme === 'light' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            {user.username && (
              <p className={`text-base ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>@{user.username}</p>
            )}
          </div>

          {/* Bio */}
          <p className={`text-center text-sm max-w-md mb-6 px-4 ${theme === 'light' ? 'text-gray-700' : 'text-white/90'}`}>
            {user.bio || 'No bio yet. Click edit to add one.'}
          </p>

          {/* Followers/Following */}
          <div className={`flex gap-6 mb-8 backdrop-blur-md rounded-2xl py-2 px-6 ${
            theme === 'light' 
              ? 'bg-gray-200 border-2 border-gray-300' 
              : 'bg-white/30 border border-white/40'
          }`}>
            <button 
              onClick={() => setShowFollowersModal(true)}
              className="text-center hover:opacity-80 transition flex-1"
            >
              <div className={`text-xl font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>{followersCount.toLocaleString()}</div>
              <div className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-300'} text-xs uppercase tracking-wide font-medium`}>Followers</div>
            </button>
            <div className={`w-px ${theme === 'light' ? 'bg-gray-300' : 'bg-white/20'}`}></div>
            <button 
              onClick={() => {
                setFollowingModalTab('following');
                setSearchQuery('');
                setSearchUsers([]);
                setUsersLoaded(false);
                setShowFollowingModal(true);
              }}
              className="text-center hover:opacity-80 transition flex-1"
            >
              <div className={`text-xl font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>{followingCount.toLocaleString()}</div>
              <div className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-300'} text-xs uppercase tracking-wide font-medium`}>Following</div>
            </button>
          </div>

          {/* Add New Link Button */}
          <button 
            onClick={() => setShowAddLinkModal(true)}
            className={`w-full max-w-md ${theme === 'light' ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' : 'bg-white/30 border-white/10 hover:bg-white/40'} backdrop-blur-md border rounded-2xl py-3 px-6 flex items-center justify-center gap-2 transition mb-3`}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold text-[12px] text-white">Add New Link</span>
          </button>

          {/* Handles Divider */}
          <div className="w-full max-w-md mb-3 relative flex items-center justify-center">
            {/* Center content */}
            <div className="flex items-center gap-2 px-4 bg-black/2 backdrop-blur-sm rounded-full py-1">
              <svg className={`w-5 h-5 ${theme === 'light' ? 'text-black' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H2a1 1 0 001-1V4a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              </svg>
              <span className={`font-medium ${theme === 'light' ? 'text-black' : 'text-white'}`}>Handles</span>
              <svg className={`w-5 h-5 ${theme === 'light' ? 'text-black' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H2a1 1 0 001-1V4a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              </svg>
            </div>
            
            {/* Horizontal line */}
            <div className={`absolute inset-x-0 h-0.5 -z-10 ${theme === 'light' ? 'bg-gray-400' : 'bg-gray-300/30'}`}></div>
          </div>

          {/* Links */}
          <div className="w-full max-w-md space-y-2">
            {links.map((link) => (
              <div 
                key={link._id} 
                className={`backdrop-blur-md rounded-2xl p-3 flex items-center relative ${
                  theme === 'light' 
                    ? 'bg-white/90 border-2 border-gray-300' 
                    : 'bg-white/90'
                }`}
              >
                {/* Icon on the left - using actual favicon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=128`}
                    alt={link.title}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      // Fallback to custom icon if favicon fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.className = `w-8 h-8 ${getLinkIconBgColor(link.url)} rounded-lg flex items-center justify-center flex-shrink-0`;
                        parent.innerHTML = '';
                        const iconContainer = document.createElement('div');
                        parent.appendChild(iconContainer);
                        // This is a workaround - ideally we'd render the React component properly
                      }
                    }}
                  />
                </div>
                
                {/* Title centered */}
                <a 
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center"
                >
                  <div className="text-black font-semibold text-sm">{link.title}</div>
                </a>
                
                {/* Three-dot menu on the right */}
                <button 
                  onClick={(e) => {
                    if (openLinkMenu === link._id) {
                      setOpenLinkMenu(null);
                      setMenuPosition(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPosition({
                        top: rect.bottom + 4,
                        right: window.innerWidth - rect.right
                      });
                      setOpenLinkMenu(link._id);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Avatar Cropper */}
        {showAvatarCropper && avatarToCrop && (
          <ImageCropper
            image={avatarToCrop}
            onCropComplete={handleAvatarCropComplete}
            onCancel={handleAvatarCropCancel}
            onSkip={handleAvatarSkipCrop}
            aspect={1}
          />
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
            {/* Close Button */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4 text-black">Edit Profile</h2>

            <div className="space-y-4">
              {/* Avatar Upload */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div
                    onClick={handleAvatarClick}
                    className="w-20 h-20 rounded-full overflow-hidden cursor-pointer border-4 border-gray-300 hover:border-gray-400 transition bg-gray-200"
                  >
                    <Image
                      src={avatarPreview}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png';
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1.5 hover:bg-gray-800 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label htmlFor="displayName" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="Alex Johnson"
                />
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-7 pr-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="alexj_design"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  rows={3}
                  className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
                  placeholder="Digital Creator | UX Designer | Tech Enthusiast. Building things for the web."
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {bio.length}/150
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="w-full bg-black text-white py-3 rounded-2xl text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLinkModal && (
        <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-black/40'} backdrop-blur-sm z-50 flex items-center justify-center px-6`}>
          <div className={`bg-white rounded-2xl p-8 w-full max-w-md relative`}>
            <button
              onClick={() => setShowAddLinkModal(false)}
              className="absolute top-6 right-6 text-gray-600 hover:text-black"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6 text-black">Add New Link</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="linkTitle" className="block text-sm text-gray-600 mb-2">
                  Title
                </label>
                <input
                  id="linkTitle"
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="w-full bg-gray-100 border-gray-300 text-black border rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="e.g. My Portfolio"
                />
              </div>

              <div>
                <label htmlFor="linkUrl" className="block text-sm text-gray-600 mb-2">
                  URL
                </label>
                <input
                  id="linkUrl"
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full bg-gray-100 border-gray-300 text-black border rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="https://..."
                />
              </div>

              <button
                onClick={handleAddLink}
                disabled={addingLink}
                className="w-full bg-gray-600 text-white hover:bg-gray-700 py-3 rounded-full font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                {addingLink ? 'Adding...' : 'Add to Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Link Modal */}
      {showEditLinkModal && editingLink && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => {
                setShowEditLinkModal(false);
                setEditingLink(null);
                setEditLinkForm({ title: '', url: '' });
              }}
              className="absolute top-6 right-6 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6">Edit Link</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="editLinkTitle" className="block text-sm text-gray-400 mb-2">
                  Title
                </label>
                <input
                  id="editLinkTitle"
                  type="text"
                  value={editLinkForm.title}
                  onChange={(e) => setEditLinkForm({ ...editLinkForm, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-600"
                  placeholder="My Portfolio"
                />
              </div>

              <div>
                <label htmlFor="editLinkUrl" className="block text-sm text-gray-400 mb-2">
                  URL
                </label>
                <input
                  id="editLinkUrl"
                  type="url"
                  value={editLinkForm.url}
                  onChange={(e) => setEditLinkForm({ ...editLinkForm, url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-600"
                  placeholder="https://example.com"
                />
              </div>

              <button
                onClick={handleUpdateLink}
                disabled={editingLinkLoading}
                className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                {editingLinkLoading ? 'Updating...' : 'Update Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className={`fixed inset-0 ${theme === 'light' ? 'bg-black/40' : 'bg-black/60'} backdrop-blur-sm z-50 flex items-end`} onClick={() => setShowFollowersModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-2xl font-bold text-black">Followers</h2>
                  <p className="text-sm text-gray-400">{followersCount.toLocaleString()} people</p>
                </div>
                <button
                  onClick={() => setShowFollowersModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Broadcast Button */}
            <div className="px-6 pt-4">
              <button 
                onClick={handleOpenBroadcast}
                className="w-full bg-gray-800 text-white hover:bg-gray-700 py-4 rounded-2xl font-semibold transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                {selectedFollowers.length > 0 
                  ? `Broadcast to ${selectedFollowers.length} Follower${selectedFollowers.length > 1 ? 's' : ''}`
                  : 'Broadcast to All Followers'
                }
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search followers"
                  value={searchFollowers}
                  onChange={(e) => setSearchFollowers(e.target.value)}
                  className="w-full bg-gray-100 text-gray-800 placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            {/* Followers List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {followers
                .filter(follower => 
                  follower.name?.toLowerCase().includes(searchFollowers.toLowerCase()) ||
                  follower.username?.toLowerCase().includes(searchFollowers.toLowerCase())
                )
                .map((follower) => (
                  <div key={follower._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleFollowerSelection(follower._id)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${
                          selectedFollowers.includes(follower._id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selectedFollowers.includes(follower._id) && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      
                      <Image
                        src={follower.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                        alt={follower.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-black">{follower.displayName || follower.name}</div>
                        {follower.username && (
                          <div className="text-sm text-gray-400">@{follower.username}</div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (follower.username) {
                          setShowFollowersModal(false);
                          router.push(`/profile/${follower.username}`);
                        } else {
                          toast.error('User has no username');
                        }
                      }}
                      className="text-blue-600 font-semibold text-sm hover:text-blue-700"
                    >
                      View
                    </button>
                  </div>
                ))}
              {followers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">No followers yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className={`fixed inset-0 ${theme === 'light' ? 'bg-black/40' : 'bg-black/60'} backdrop-blur-sm z-50 flex items-end`} onClick={() => {
          setShowFollowingModal(false);
          setUsersLoaded(false);
          setSearchQuery('');
          setSearchUsers([]);
        }}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    {followingModalTab === 'following' ? 'Following' : 'Search for Friends'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {followingModalTab === 'following' 
                      ? `${followingCount.toLocaleString()} people` 
                      : 'Find new people to follow'
                    }
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowFollowingModal(false);
                    setUsersLoaded(false);
                    setSearchQuery('');
                    setSearchUsers([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setFollowingModalTab('following');
                    setUsersLoaded(false);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                    followingModalTab === 'following' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Following
                </button>
                <button
                  onClick={() => {
                    setFollowingModalTab('search');
                    setUsersLoaded(false);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
                    followingModalTab === 'search' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Search Friends
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-6 py-4">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={followingModalTab === 'following' ? 'Search following' : 'Search for users'}
                  value={followingModalTab === 'following' ? searchFollowing : searchQuery}
                  onChange={(e) => {
                    if (followingModalTab === 'following') {
                      setSearchFollowing(e.target.value);
                    } else {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  className="w-full bg-gray-100 text-gray-800 placeholder-gray-400 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {followingModalTab === 'following' ? (
                // Following List
                <>
                  {following
                    .filter(user => 
                      user.name?.toLowerCase().includes(searchFollowing.toLowerCase()) ||
                      user.username?.toLowerCase().includes(searchFollowing.toLowerCase())
                    )
                    .map((user) => (
                      <div key={user._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <Image
                            src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                            alt={user.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-semibold text-black">{user.displayName || user.name}</div>
                            {user.username && (
                              <div className="text-sm text-gray-400">@{user.username}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUnfollowUser(user._id)}
                            className="text-red-600 font-semibold text-sm hover:text-red-700 px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50"
                          >
                            Unfollow
                          </button>
                          <button 
                            onClick={() => {
                              if (user.username) {
                                setShowFollowingModal(false);
                                router.push(`/profile/${user.username}`);
                              } else {
                                toast.error('User has no username');
                              }
                            }}
                            className="text-blue-600 font-semibold text-sm hover:text-blue-700 px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  {following.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Not following anyone yet</p>
                    </div>
                  )}
                </>
              ) : (
                // Search Results
                <>
                  {searchQuery && searchUsers
                    .filter(user => 
                      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && searchUsers.length > 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No users found matching "{searchQuery}"</p>
                    </div>
                  )}
                  {searchUsers.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-400">No new users to follow</p>
                    </div>
                  )}
                  {searchUsers
                    .filter(user => 
                      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((user) => (
                    <div key={user.id || user._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <Image
                          src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                          alt={user.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-semibold text-black">{user.displayName || user.name}</div>
                          {user.username && (
                            <div className="text-sm text-gray-400">@{user.username}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleFollowUser(user.id || user._id)}
                          className="text-blue-600 font-semibold text-sm hover:text-blue-700 px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50"
                        >
                          Follow
                        </button>
                        <button 
                          onClick={() => {
                            if (user.username) {
                              setShowFollowingModal(false);
                              router.push(`/profile/${user.username}`);
                            } else {
                              toast.error('User has no username');
                            }
                          }}
                          className="text-gray-600 font-semibold text-sm hover:text-gray-700 px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowBroadcastModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold text-black">New Broadcast</h2>
              </div>
            </div>

            {/* To Field */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">To:</span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedFollowers.length > 0 
                    ? `${selectedFollowers.length} Follower${selectedFollowers.length > 1 ? 's' : ''}`
                    : `All Followers (${followersCount.toLocaleString()})`
                  }
                </span>
              </div>
            </div>

            {/* Message Input */}
            <div className="flex-1 p-6">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                maxLength={500}
                placeholder="What's on your mind? This message will be sent to all your followers."
                className="w-full h-full min-h-[300px] text-black placeholder-gray-400 bg-transparent focus:outline-none resize-none text-lg"
              />
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {broadcastMessage.length}/500
                </span>
              </div>
              
              <button
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className="w-full bg-gray-600 text-white hover:bg-gray-700 py-4 rounded-2xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Followers will receive a notification. Replies are disabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Dropdown Menu for Links */}
      {openLinkMenu && menuPosition && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-[999]" 
            onClick={() => {
              setOpenLinkMenu(null);
              setMenuPosition(null);
            }}
          ></div>
          
          {/* Menu */}
          <div 
            className="fixed z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
          >
            <button
              onClick={() => {
                const linkId = openLinkMenu;
                setOpenLinkMenu(null);
                setMenuPosition(null);
                const link = links.find(l => l._id === linkId);
                if (link) handleEditLink(link);
              }}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                const linkId = openLinkMenu;
                setOpenLinkMenu(null);
                setMenuPosition(null);
                if (linkId) handleReorderLink(linkId);
              }}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Reorder
            </button>
            <button
              onClick={() => {
                const linkId = openLinkMenu;
                setOpenLinkMenu(null);
                setMenuPosition(null);
                if (linkId) handleDeleteLink(linkId);
              }}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </>
      )}

      {/* Avatar Preview Modal */}
      <AvatarPreview
        isOpen={showAvatarPreview}
        onClose={() => setShowAvatarPreview(false)}
        avatarUrl={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
        altText={user.displayName || user.name}
      />
    </div>
  );
}