'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import { getLinkIcon, getLinkIconBgColor } from '@/utils/linkIcons';
import Image from 'next/image';
import publicApi from '@/lib/publicApi';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AvatarPreview from '@/components/AvatarPreview';

interface Link {
  _id: string;
  title: string;
  url: string;
  order: number;
}

interface ProfileUser {
  _id: string;
  id?: string;
  name: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  followers: string[];
  following: string[];
  followersCount?: number;
  followingCount?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [pendingAction, setPendingAction] = useState<'follow' | 'followers' | 'following' | 'tarpup' | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Debug: Log showLoginModal state changes
  useEffect(() => {
    console.log('showLoginModal state changed:', showLoginModal);
  }, [showLoginModal]);

  useEffect(() => {
    // Allow unauthenticated access - just fetch the profile
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for username:', username);
      
      // Check if username is actually "undefined" string
      if (!username || username === 'undefined') {
        toast.error('Invalid profile URL');
        router.push('/dashboard');
        return;
      }
      
      let userId = username;
      let foundUser = null;
      
      // Try to find user by username first
      try {
        const usersResponse = await api.get('/users');
        console.log('Users response count:', usersResponse.data.length);
        
        foundUser = usersResponse.data.find((u: any) => u.username === username);
        console.log('Found user by username:', foundUser);
        
        if (foundUser) {
          userId = foundUser._id || foundUser.id;
        } else {
          // Maybe it's already an ID
          console.log('Username not found, trying as ID');
        }
      } catch (error) {
        console.log('Could not fetch users list, trying direct ID lookup');
      }

      // Fetch full user details including followers/following
      console.log('Fetching user details for ID:', userId);
      const userDetailResponse = await api.get(`/users/${userId}`);
      console.log('User detail response:', userDetailResponse.data);
      setProfileUser(userDetailResponse.data);

      // Check if current user is following the profile user (only if logged in)
      if (currentUser) {
        console.log('Fetching following list...');
        try {
          const followingResponse = await api.get('/follows/following');
          console.log('Following response:', followingResponse.data);
          
          // Get the actual user ID from the detailed response
          const targetUserId = userDetailResponse.data._id || userDetailResponse.data.id;
          console.log('Target user ID:', targetUserId);
          
          const followingIds = followingResponse.data.following?.map((f: any) => f._id || f.id) || [];
          console.log('Following IDs:', followingIds);
          
          const isCurrentlyFollowing = followingIds.includes(targetUserId);
          console.log('Am I following this user:', isCurrentlyFollowing);
          setIsFollowing(isCurrentlyFollowing);
        } catch (error) {
          console.log('Could not fetch follow status');
        }
      }

      // Fetch user's links
      try {
        console.log('Fetching links for user:', userId);
        const linksResponse = await api.get(`/users/${userId}/links`);
        console.log('Links response:', linksResponse.data);
        setLinks(linksResponse.data.links || []);
      } catch (error: any) {
        console.error('Error fetching links:', error.response?.data || error.message);
        setLinks([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to load profile');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    console.log('=== handleFollowToggle called ===');
    console.log('profileUser:', profileUser);
    console.log('currentUser:', currentUser);
    
    if (!profileUser) {
      console.log('No profileUser, returning early');
      return;
    }

    // Check if user is logged in first
    if (!currentUser) {
      console.log('No currentUser - showing login modal');
      setPendingAction('follow');
      setShowLoginModal(true);
      console.log('showLoginModal state set to true');
      return;
    }

    const targetUserId = profileUser._id || profileUser.id;
    console.log('Toggling follow for user ID:', targetUserId);
    console.log('Current follow status:', isFollowing);

    setFollowLoading(true);
    try {
      if (isFollowing) {
        console.log('Unfollowing...');
        await api.delete(`/follows/${targetUserId}`);
        toast.success('Unfollowed successfully');
        setIsFollowing(false);
        // Update follower count
        setProfileUser({
          ...profileUser,
          followers: profileUser.followers.filter(id => id !== currentUser?.id),
          followersCount: (profileUser.followersCount || 1) - 1,
        });
      } else {
        console.log('Following...');
        await api.post(`/follows/${targetUserId}`);
        toast.success('Following successfully');
        setIsFollowing(true);
        // Update follower count
        setProfileUser({
          ...profileUser,
          followers: [...profileUser.followers, currentUser?.id || ''],
          followersCount: (profileUser.followersCount || 0) + 1,
        });
      }
    } catch (error: any) {
      console.error('Follow toggle error:', error);
      console.log('Error status:', error.response?.status);
      
      // Show login modal on 401 error instead of redirecting
      if (error.response?.status === 401) {
        console.log('401 error - showing login modal');
        setShowLoginModal(true);
        console.log('showLoginModal state set to true after 401');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update follow status');
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/profile/${username}`;
    if (navigator.share) {
      navigator.share({
        title: `${profileUser?.displayName || profileUser?.name}'s Profile`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied!');
    }
  };

  const fetchFollowers = async () => {
    if (!profileUser || !currentUser) return;
    setFollowersLoading(true);
    try {
      const targetUserId = profileUser._id || profileUser.id;
      const response = await api.get(`/follows/followers/${targetUserId}`);
      setFollowers(response.data.followers || []);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
      toast.error('Failed to load followers');
    } finally {
      setFollowersLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!profileUser || !currentUser) return;
    setFollowingLoading(true);
    try {
      const targetUserId = profileUser._id || profileUser.id;
      const response = await api.get(`/follows/following/${targetUserId}`);
      setFollowing(response.data.following || []);
    } catch (error) {
      console.error('Failed to fetch following:', error);
      toast.error('Failed to load following');
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleShowFollowers = () => {
    console.log('=== handleShowFollowers called ===');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
      console.log('No currentUser - showing login modal for followers');
      setPendingAction('followers');
      setShowLoginModal(true);
      return;
    }
    
    console.log('User is authenticated, showing followers modal');
    setShowFollowersModal(true);
    fetchFollowers();
  };

  const handleShowFollowing = () => {
    console.log('=== handleShowFollowing called ===');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
      console.log('No currentUser - showing login modal for following');
      setPendingAction('following');
      setShowLoginModal(true);
      return;
    }
    
    console.log('User is authenticated, showing following modal');
    setShowFollowingModal(true);
    fetchFollowing();
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
      // Map pendingAction to source string
      const sourceMap = {
        follow: 'profile_follow',
        followers: 'profile_followers',
        following: 'profile_following',
        tarpup: 'profile_tarpup',
      };
      
      // Create account silently
      const signupResponse = await publicApi.post('/auth/silent-signup', {
        name: signupName,
        email: signupEmail,
        password: Math.random().toString(36).slice(-8), // Generate random password
        source: pendingAction ? sourceMap[pendingAction] : undefined,
        referrerId: profileUser?._id || profileUser?.id,
      });
      
      console.log('Account created:', signupResponse.data);
      
      // Store token and user data
      const { token, user } = signupResponse.data;
      localStorage.setItem('token', token);
      useAuthStore.getState().setAuth(user, token);
      
      // Close modal
      setShowLoginModal(false);
      
      // Execute the pending action
      if (pendingAction === 'follow' && profileUser) {
        // Trigger follow action directly with the new user
        const targetUserId = profileUser._id || profileUser.id;
        try {
          await api.post(`/follows/${targetUserId}`);
          setIsFollowing(true);
          setProfileUser({
            ...profileUser,
            followers: [...profileUser.followers, user.id],
            followersCount: (profileUser.followersCount || 0) + 1,
          });
        } catch (error) {
          console.error('Failed to follow:', error);
        }
      } else if (pendingAction === 'followers') {
        setShowFollowersModal(true);
        fetchFollowers();
      } else if (pendingAction === 'following') {
        setShowFollowingModal(true);
        fetchFollowing();
      } else if (pendingAction === 'tarpup' && profileUser) {
        // For TarpUp, automatically follow the user first to enable chat
        const targetUserId = profileUser._id || profileUser.id;
        try {
          await api.post(`/follows/${targetUserId}`);
          setIsFollowing(true);
          setProfileUser({
            ...profileUser,
            followers: [...profileUser.followers, user.id],
            followersCount: (profileUser.followersCount || 0) + 1,
          });
        } catch (error) {
          console.error('Failed to follow:', error);
        }
        // Navigate to chat
        router.push(`/chat/${targetUserId}`);
      }
      
      // Reset
      setPendingAction(null);
      setSignupName('');
      setSignupEmail('');
    } catch (error: any) {
      console.error('Failed to create account:', error);
      toast.error(error.response?.data?.message || 'Failed to create account');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!profileUser) {
    return null;
  }

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${
        theme === 'dark' ? 'text-white' : 'text-black'
      }`}
      style={
        theme === 'dark'
          ? {
              background: '#000000',
            }
          : theme === 'light'
          ? {
              background: '#e6e6e6',
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
      {/* Overlay for better text readability */}
      {theme === 'background' && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Icons */}
        <div className="flex justify-between items-start p-6">
          <button 
            onClick={handleBack}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition ${
              theme === 'light' 
                ? 'bg-white/30 hover:bg-white/50' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
          >
            <svg className={`w-5 h-5 ${theme === 'light' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={handleShare}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition ${
              theme === 'light' 
                ? 'bg-white/30 hover:bg-white/50' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
          >
            <svg className={`w-5 h-5 ${theme === 'light' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Profile Section */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 pb-32 pt-4">
          {/* Avatar */}
          <div className="relative mb-4">
            <div 
              onClick={() => setShowAvatarPreview(true)}
              className={`w-28 h-28 rounded-full border-4 overflow-hidden bg-gray-800 cursor-pointer hover:opacity-90 transition ${
                theme === 'light' ? 'border-white' : 'border-white/20'
              }`}
            >
              <Image
                src={profileUser.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                alt={profileUser.displayName || profileUser.name}
                width={160}
                height={160}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png';
                }}
              />
            </div>
          </div>

          {/* Name and Username */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className={`text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{profileUser.displayName || profileUser.name}</h1>
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            {profileUser.username && (
              <p className={`text-base ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>@{profileUser.username}</p>
            )}
          </div>
         
          {/* Follow Button and Stats */}
          <div className="flex items-center gap-6 mb-8">
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`px-4 py-2.5 rounded-full font-semibold transition disabled:opacity-50 flex items-center gap-2 text-sm ${
                isFollowing
                  ? theme === 'light'
                    ? 'bg-gray-300 text-black hover:bg-gray-400 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
            </button>

            <button
              onClick={handleShowFollowers}
              className="text-center hover:opacity-80 transition cursor-pointer"
            >
              <div className={`text-[15px] font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>{profileUser.followers?.length || 0}</div>
              <div className={`text-[11px] uppercase tracking-wide font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>FOLLOWERS</div>
            </button>

            <button
              onClick={handleShowFollowing}
              className="text-center hover:opacity-80 transition cursor-pointer"
            >
              <div className={`text-[15px] font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>{profileUser.following?.length || 0}</div>
              <div className={`text-[11px] uppercase tracking-wide font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>FOLLOWING</div>
            </button>
          </div>
          {/* Bio */}
          <p className={`text-center text-sm max-w-md mb-6 px-4 ${theme === 'light' ? 'text-gray-700' : 'text-white/90'}`}>
            {profileUser.bio || 'No bio yet.'}
          </p>

          {/* TarpUp Button */}
          <button 
            onClick={() => {
              if (!currentUser) {
                setPendingAction('tarpup');
                setShowLoginModal(true);
                return;
              }
              const targetUserId = profileUser._id || profileUser.id;
              router.push(`/chat/${targetUserId}`);
            }}
            className={` max-w-md backdrop-blur-md border-2 rounded-2xl py-2.5 px-10 flex items-center justify-center gap-2 transition mb-3 ${
              theme === 'light' 
                ? 'bg-pink-500 hover:bg-pink-600 border-pink-500 text-white' 
                : 'bg-white/30 border-white/20 hover:bg-white/50 text-white'
            }`}
          >
            <span className="text-base font-light">
              Click to TarpUp <span className="font-bold">{profileUser.displayName || profileUser.name}</span>
            </span>
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
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
              <a
                key={link._id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`backdrop-blur-md rounded-2xl p-3 flex items-center hover:bg-white transition ${
                  theme === 'light' 
                    ? 'bg-white/90 border-2 border-gray-300' 
                    : 'bg-white/90'
                }`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100">
                  <img 
                    src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=128`}
                    alt={link.title}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.className = `w-8 h-8 ${getLinkIconBgColor(link.url)} rounded-lg flex items-center justify-center flex-shrink-0`;
                      }
                    }}
                  />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-black font-semibold text-sm">{link.title}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && currentUser && (
        <div className={`fixed inset-0 ${theme === 'light' ? 'bg-black/40' : 'bg-black/60'} backdrop-blur-sm z-50 flex items-end`} onClick={() => setShowFollowersModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">Followers</h2>
                  <p className="text-sm text-gray-500">{followers.length} people</p>
                </div>
                <button onClick={() => setShowFollowersModal(false)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {followersLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div></div>
              ) : followers.length === 0 ? (
                <div className="text-center py-12"><p className="text-gray-500">No followers yet</p></div>
              ) : (
                followers.map((follower) => (
                  <div key={follower._id || follower.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Image src={follower.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'} alt={follower.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-black">{follower.displayName || follower.name}</div>
                        {follower.username && <div className="text-sm text-gray-500">@{follower.username}</div>}
                      </div>
                    </div>
                    <button onClick={() => { if (follower.username) { setShowFollowersModal(false); router.push(`/${follower.username}`); } else { toast.error('User has no username'); } }} className="text-blue-600 font-medium text-sm hover:text-blue-700">View</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && currentUser && (
        <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm z-50 flex items-end`} onClick={() => setShowFollowingModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">Following</h2>
                  <p className="text-sm text-gray-500">{following.length} people</p>
                </div>
                <button onClick={() => setShowFollowingModal(false)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {followingLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div></div>
              ) : following.length === 0 ? (
                <div className="text-center py-12"><p className="text-gray-500">Not following anyone yet</p></div>
              ) : (
                following.map((user) => (
                  <div key={user._id || user.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Image src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'} alt={user.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className="font-semibold text-black">{user.displayName || user.name}</div>
                        {user.username && <div className="text-sm text-gray-500">@{user.username}</div>}
                      </div>
                    </div>
                    <button onClick={() => { if (user.username) { setShowFollowingModal(false); router.push(`/${user.username}`); } else { toast.error('User has no username'); } }} className="text-blue-600 font-medium text-sm hover:text-blue-700">View</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar Preview Modal */}
      <AvatarPreview
        isOpen={showAvatarPreview}
        onClose={() => setShowAvatarPreview(false)}
        avatarUrl={profileUser.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
        altText={profileUser.displayName || profileUser.name}
      />

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-6" onClick={() => setShowSignupModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSignupModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-2 text-black">Join TarpUp</h2>
            <p className="text-gray-600 mb-6">Create an account to follow users and see their content</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="signupName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="signupName"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-300 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="signupEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="signupEmail"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full bg-gray-100 border border-gray-300 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
                  placeholder="Enter your email"
                />
              </div>

              <button
                onClick={handleSignupSubmit}
                className="w-full bg-pink-500 text-white hover:bg-pink-600 py-3 rounded-full font-semibold transition"
              >
                Continue
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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-6" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowLoginModal(false)}
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
                  placeholder="Enter your name"
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
