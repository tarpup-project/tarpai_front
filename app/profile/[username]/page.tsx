'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
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

  useEffect(() => {
    // Wait a bit for auth store to rehydrate from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!currentUser) {
      // Auth store is still rehydrating, wait a bit
      const timer = setTimeout(() => {
        if (!currentUser) {
          router.push('/login');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    fetchProfile();
  }, [username, currentUser, router]);

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

      // Check if the profile user is following the current user (is in current user's followers)
      console.log('Fetching followers list...');
      const followersResponse = await api.get('/follows/followers');
      console.log('Followers response:', followersResponse.data);
      
      // Get the actual user ID from the detailed response
      const targetUserId = userDetailResponse.data._id || userDetailResponse.data.id;
      console.log('Target user ID:', targetUserId);
      
      const followerIds = followersResponse.data.followers?.map((f: any) => f._id || f.id) || [];
      console.log('Follower IDs:', followerIds);
      
      const isCurrentlyFollowing = followerIds.includes(targetUserId);
      console.log('Is this user following me (should show unfollow):', isCurrentlyFollowing);
      setIsFollowing(isCurrentlyFollowing);

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
    if (!profileUser) return;

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
      toast.error(error.response?.data?.message || 'Failed to update follow status');
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
    if (!profileUser) return;
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
    if (!profileUser) return;
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
    setShowFollowersModal(true);
    fetchFollowers();
  };

  const handleShowFollowing = () => {
    setShowFollowingModal(true);
    fetchFollowing();
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
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Profile Section */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 pb-32 pt-4">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-white/20 overflow-hidden bg-gray-800">
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
              <h1 className="text-xl font-bold">{profileUser.displayName || profileUser.name}</h1>
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            {profileUser.username && (
              <p className="text-gray-300 text-base">@{profileUser.username}</p>
            )}
          </div>

          {/* Bio */}
          <p className="text-center text-white/90 text-sm max-w-md mb-6 px-4">
            {profileUser.bio || 'No bio yet.'}
          </p>

          {/* Follow Button and Stats */}
          <div className="flex items-center gap-6 mb-8">
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`px-8 py-2 rounded-full font-semibold transition disabled:opacity-50 flex items-center gap-2 ${
                isFollowing
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
            </button>

            <button
              onClick={handleShowFollowers}
              className="text-center hover:opacity-80 transition cursor-pointer"
            >
              <div className="text-xl font-bold">{profileUser.followers?.length || 0}</div>
              <div className="text-gray-300 text-xs uppercase tracking-wide">Followers</div>
            </button>

            <button
              onClick={handleShowFollowing}
              className="text-center hover:opacity-80 transition cursor-pointer"
            >
              <div className="text-xl font-bold">{profileUser.following?.length || 0}</div>
              <div className="text-gray-300 text-xs uppercase tracking-wide">Following</div>
            </button>
          </div>

          {/* TarpUp Button */}
          <button 
            onClick={() => {
              const targetUserId = profileUser._id || profileUser.id;
              router.push(`/chat/${targetUserId}`);
            }}
            className={`w-full max-w-md ${theme === 'dark' ? 'bg-black/30 border-white/20 hover:bg-black/50' : 'bg-white/30 border-gray-300 hover:bg-white/50'} backdrop-blur-md border rounded-2xl py-3 px-6 flex items-center justify-center gap-2 transition mb-3`}
          >
            <span className="text-[12px]">
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
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H2a1 1 0 001-1V4a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              </svg>
              <span className="text-white font-medium">Handles</span>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H2a1 1 0 001-1V4a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
              </svg>
            </div>
            
            {/* Horizontal line */}
            <div className="absolute inset-x-0 h-0.5 bg-gray-300/30 -z-10"></div>
          </div>

          {/* Links */}
          <div className="w-full max-w-md space-y-2">
            {links.map((link) => (
              <a
                key={link._id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 backdrop-blur-md rounded-2xl p-3 flex items-center hover:bg-white transition"
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
      {showFollowersModal && (
        <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm z-50 flex items-end`} onClick={() => setShowFollowersModal(false)}>
          <div 
            className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Followers</h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{followers.length} people</p>
                </div>
                <button onClick={() => setShowFollowersModal(false)} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {followersLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div></div>
              ) : followers.length === 0 ? (
                <div className="text-center py-12"><p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No followers yet</p></div>
              ) : (
                followers.map((follower) => (
                  <div key={follower._id || follower.id} className={`flex items-center justify-between py-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'} last:border-0`}>
                    <div className="flex items-center gap-3">
                      <Image src={follower.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'} alt={follower.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{follower.displayName || follower.name}</div>
                        {follower.username && <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{follower.username}</div>}
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
      {showFollowingModal && (
        <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm z-50 flex items-end`} onClick={() => setShowFollowingModal(false)}>
          <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up`} onClick={(e) => e.stopPropagation()}>
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Following</h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{following.length} people</p>
                </div>
                <button onClick={() => setShowFollowingModal(false)} className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {followingLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div></div>
              ) : following.length === 0 ? (
                <div className="text-center py-12"><p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Not following anyone yet</p></div>
              ) : (
                following.map((user) => (
                  <div key={user._id || user.id} className={`flex items-center justify-between py-3 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'} last:border-0`}>
                    <div className="flex items-center gap-3">
                      <Image src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'} alt={user.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{user.displayName || user.name}</div>
                        {user.username && <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>@{user.username}</div>}
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
    </div>
  );
}
