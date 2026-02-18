'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { getLinkIcon, getLinkIconBgColor } from '@/utils/linkIcons';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Wait for Zustand to rehydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration
    
    if (!user) {
      router.push('/login');
    } else {
      // Fetch follow counts and refresh user data
      fetchUserData();
    }
  }, [user, router, isHydrated]);

  const fetchUserData = async () => {
    try {
      console.log('Fetching follow counts and user data...');
      
      // Fetch follow counts, links, backgrounds, and notifications
      const [followersRes, followingRes, linksRes, backgroundsRes, notificationsRes] = await Promise.all([
        api.get('/follows/followers'),
        api.get('/follows/following'),
        api.get('/users/links/my'),
        api.get('/appearance/backgrounds'),
        api.get('/notifications'),
      ]);
      setFollowersCount(followersRes.data.followers?.length || 0);
      setFollowingCount(followingRes.data.following?.length || 0);
      setLinks(linksRes.data.links || []);
      setBackgrounds(backgroundsRes.data.backgrounds || []);
      setNotifications(notificationsRes.data.notifications || []);
      
      // Count unread notifications
      const unread = notificationsRes.data.notifications?.filter((n: any) => !n.isRead).length || 0;
      setUnreadCount(unread);
      
      // Set current background as selected
      if (background) {
        setSelectedBackground(background);
      }
      
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
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleOpenAppearance = async () => {
    setShowAppearanceModal(true);
    
    // Load currently selected background from localStorage
    const currentBg = localStorage.getItem('selectedBackground');
    if (currentBg) {
      setSelectedBackground(currentBg);
    }
    
    try {
      const response = await api.get('/appearance/backgrounds');
      setBackgrounds(response.data.backgrounds || []);
    } catch (error) {
      console.error('Failed to fetch backgrounds:', error);
    }
  };

  const handleSelectBackground = (backgroundUrl: string) => {
    setSelectedBackground(backgroundUrl);
    // Save to localStorage for persistence
    localStorage.setItem('selectedBackground', backgroundUrl);
    toast.success('Background selected!');
    // Force refresh the background hook
    window.location.reload();
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
      
      // Force refresh to apply new background
      window.location.reload();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload background');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotificationsModal(true);
  };

  const handleOpenShare = async () => {
    router.push('/share-profile');
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
        );
      case 'broadcast':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        );
      case 'follow':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      case 'feature':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
    }
  };

  const handleBackgroundSelect = (bgUrl: string) => {
    setSelectedBackground(bgUrl);
    // Reload page to apply new background
    window.location.reload();
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Upload to get URL (reusing avatar upload endpoint)
      const uploadRes = await api.post('/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = uploadRes.data.user.avatar;

      // Add as user background
      await api.post('/appearance/backgrounds', {
        url: imageUrl,
        name: 'My Background',
        thumbnail: imageUrl,
      });

      toast.success('Background uploaded successfully!');

      // Refresh backgrounds
      const backgroundsRes = await api.get('/appearance/backgrounds');
      setBackgrounds(backgroundsRes.data.backgrounds || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload background');
    } finally {
      setUploadingBackground(false);
    }
  };

  if (!isHydrated || !user || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: background 
          ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${background})`
          : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Icons */}
        <div className="flex justify-between items-start p-6">
          <Image src="/logo.png" alt="TarpAI" width={40} height={40} className="w-10 h-10" />
          
          <div className="flex gap-4">
            <button 
              onClick={handleOpenNotifications}
              className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition relative"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={handleOpenAppearance}
              className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button 
              onClick={handleOpenShare}
              className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          {/* Avatar with Camera Button */}
          <div className="relative mb-6">
            <div className="w-40 h-40 rounded-full border-4 border-white/20 overflow-hidden bg-gray-800">
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
              className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition"
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
              <h1 className="text-3xl font-bold">{user.displayName || user.name}</h1>
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <button onClick={handleEditProfile} className="text-gray-300 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            {user.username && (
              <p className="text-gray-300 text-lg">@{user.username}</p>
            )}
          </div>

          {/* Bio */}
          <p className="text-center text-white/90 max-w-md mb-8 px-4">
            {user.bio || 'No bio yet. Click edit to add one.'}
          </p>

          {/* Followers/Following */}
          <div className="flex gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold">{followersCount.toLocaleString()}</div>
              <div className="text-gray-300 text-sm uppercase tracking-wide">Followers</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-bold">{followingCount.toLocaleString()}</div>
              <div className="text-gray-300 text-sm uppercase tracking-wide">Following</div>
            </div>
          </div>

          {/* Add New Link Button */}
          <button 
            onClick={() => setShowAddLinkModal(true)}
            className="w-full max-w-md bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl py-4 px-6 flex items-center justify-center gap-2 hover:bg-black/50 transition mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">Add New Link</span>
          </button>

          {/* Links */}
          <div className="w-full max-w-md space-y-3">
            {links.map((link) => (
              <div key={link._id} className="bg-white/90 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 ${getLinkIconBgColor(link.url)} rounded-lg flex items-center justify-center`}>
                  {getLinkIcon(link.url)}
                </div>
                <div className="flex-1">
                  <div className="text-black font-semibold">{link.title}</div>
                  <div className="text-gray-600 text-sm truncate">{link.url}</div>
                </div>
                <a 
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button 
                  onClick={() => handleDeleteLink(link._id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10">
          <div className="flex justify-around items-center py-4 px-6 max-w-md mx-auto">
            <button className="flex flex-col items-center gap-1 text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="text-xs">Home</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <Image src="/logo.png" alt="TarpAI" width={24} height={24} className="w-6 h-6" />
              <span className="text-xs">TarpAI</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs">Chats</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="text-xs">Status</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span className="text-xs">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md relative">
            {/* Close Button */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div
                    onClick={handleAvatarClick}
                    className="w-24 h-24 rounded-full overflow-hidden cursor-pointer border-4 border-gray-800 hover:border-gray-700 transition bg-gray-800"
                  >
                    <Image
                      src={avatarPreview}
                      alt="Profile"
                      width={96}
                      height={96}
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
                    className="absolute bottom-0 right-0 bg-white text-black rounded-full p-2 hover:bg-gray-200 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <label htmlFor="displayName" className="block text-sm text-gray-400 mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-600"
                  placeholder="Alex Johnson"
                />
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm text-gray-400 mb-2">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-gray-600"
                    placeholder="alexi_design"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm text-gray-400 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-600 resize-none"
                  placeholder="Digital Creator | UX Designer | Tech Enthusiast. Building things for the web."
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {bio.length}/150
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md relative">
            <button
              onClick={() => setShowAddLinkModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6">Add New Link</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="linkTitle" className="block text-sm text-gray-400 mb-2">
                  Title
                </label>
                <input
                  id="linkTitle"
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-600"
                  placeholder="My Portfolio"
                />
              </div>

              <div>
                <label htmlFor="linkUrl" className="block text-sm text-gray-400 mb-2">
                  URL
                </label>
                <input
                  id="linkUrl"
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-600"
                  placeholder="https://example.com"
                />
              </div>

              <button
                onClick={handleAddLink}
                disabled={addingLink}
                className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                {addingLink ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden relative flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-black">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="text-gray-400 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No more notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                      className={`p-3 rounded-xl cursor-pointer transition ${
                        notification.isRead ? 'bg-gray-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="text-sm font-semibold text-black">{notification.title}</h3>
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
                          {notification.actionUrl && (
                            <button className="text-xs font-medium text-black bg-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition">
                              {notification.actionText || 'View'}
                            </button>
                          )}
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-4 top-1/2 -translate-y-1/2"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Appearance Settings Modal */}
      {showAppearanceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowAppearanceModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-black mb-6">Appearance Settings</h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-black mb-4">Profile Background</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Upload Button */}
                <button
                  onClick={() => backgroundInputRef.current?.click()}
                  disabled={uploadingBackground}
                  className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingBackground ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-2"></div>
                      <span className="text-sm text-gray-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm text-gray-500">Choose from device</span>
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
                    className={`aspect-[3/4] rounded-xl overflow-hidden border-4 transition ${
                      selectedBackground === bg.url ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={bg.thumbnail || bg.url}
                      alt={bg.name}
                      width={200}
                      height={267}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowAppearanceModal(false)}
              className="w-full bg-black text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
