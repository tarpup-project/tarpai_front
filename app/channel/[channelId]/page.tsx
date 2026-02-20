'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';

interface Post {
  id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    username: string;
    avatar: string;
  };
  isLiked: boolean;
  likesCount: number;
  createdAt: string;
}

interface Channel {
  id: string;
  title: string;
  subtitle: string;
  avatar: string;
  owner: {
    _id: string;
    name: string;
    username: string;
  };
  subscribersCount: number;
  isSubscribed: boolean;
  isOwner: boolean;
}

export default function ChannelPage() {
  const router = useRouter();
  const params = useParams();
  const channelId = params.channelId as string;
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/chats' || currentPath.startsWith('/chat/') || currentPath.startsWith('/channel/')) {
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (!currentUser) {
      const timer = setTimeout(() => {
        if (!currentUser) {
          router.push('/login');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Validate channelId format (should be 24 character hex string)
    if (!channelId || !/^[0-9a-fA-F]{24}$/.test(channelId)) {
      console.error('Invalid channel ID format:', channelId);
      toast.error('Invalid channel ID');
      window.location.href = '/chats';
      return;
    }

    // Create abort controller for cleanup
    const abortController = new AbortController();

    const initializeData = async () => {
      try {
        await Promise.all([
          fetchChannelData(abortController.signal),
          fetchPosts(abortController.signal)
        ]);
      } catch (error: any) {
        if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
          console.error('Failed to initialize channel data:', error);
        }
      }
    };

    initializeData();

    return () => {
      abortController.abort();
    };
  }, [channelId, currentUser, router]);

  const fetchChannelData = async (signal?: AbortSignal) => {
    try {
      const response = await api.get(`/channels/${channelId}`, { signal });
      setChannel(response.data);
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch channel:', error);
      toast.error('Failed to load channel');
      window.location.href = '/chats';
    }
  };

  const fetchPosts = async (signal?: AbortSignal) => {
    try {
      const response = await api.get(`/channels/${channelId}/posts`, { signal });
      setPosts(response.data);
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Please enter post content');
      return;
    }

    setCreatingPost(true);
    try {
      const response = await api.post(`/channels/${channelId}/posts`, {
        content: newPostContent,
      });

      // Backend returns { message, post }, so we need response.data.post
      setPosts(prev => [response.data.post, ...prev]);
      setNewPostContent('');
      setShowCreatePostModal(false);
      toast.success('Post created successfully!');
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.isLiked;
      
      if (isLiked) {
        // Unlike
        await api.delete(`/channels/posts/${postId}/like`);
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                isLiked: false,
                likesCount: p.likesCount - 1
              }
            : p
        ));
      } else {
        // Like
        await api.post(`/channels/posts/${postId}/like`);
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                isLiked: true,
                likesCount: p.likesCount + 1
              }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await api.delete(`/channels/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleBackNavigation = () => {
    // Check if we came from channels tab
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');
    
    // Small delay to prevent request conflicts
    setTimeout(() => {
      if (from === 'channels') {
        window.location.href = '/chats?tab=channels';
      } else {
        window.location.href = '/chats';
      }
    }, 100);
  };

  const handleSubscription = async () => {
    if (!channel) return;

    try {
      if (channel.isSubscribed) {
        // Unsubscribe
        await api.delete(`/channels/${channelId}/subscribe`);
        setChannel(prev => prev ? {
          ...prev,
          isSubscribed: false,
          subscribersCount: prev.subscribersCount - 1
        } : null);
        toast.success('Unsubscribed successfully');
      } else {
        // Subscribe
        await api.post(`/channels/${channelId}/subscribe`);
        setChannel(prev => prev ? {
          ...prev,
          isSubscribed: true,
          subscribersCount: prev.subscribersCount + 1
        } : null);
        toast.success('Subscribed successfully');
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!channel) {
    return null;
  }

  return (
    <div 
      className="min-h-screen text-white relative"
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col pb-20">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-md border-b border-white/10 p-4 flex items-center gap-3">
          <button
            onClick={handleBackNavigation}
            className="text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <Image
            src={channel.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
            alt={channel.title}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div className="flex-1">
            <h2 className="font-semibold">{channel.title}</h2>
            <p className="text-xs text-gray-400">{channel.subscribersCount} subscribers</p>
          </div>

          {/* Subscribe/Unsubscribe Bell Button - Only show if not owner */}
          {!channel.isOwner && (
            <button
              onClick={handleSubscription}
              className={`p-2 rounded-full transition ${
                channel.isSubscribed 
                  ? 'bg-white/20 text-white hover:bg-white/30' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-6 h-6" fill={channel.isSubscribed ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          )}
        </div>

        {/* Channel Info */}
        <div className="bg-black/40 backdrop-blur-md border-b border-white/10 p-4">
          <p className="text-gray-300">{channel.subtitle}</p>
        </div>

        {/* Posts */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400">No posts yet</p>
            </div>
          ) : (
            posts.map((post) => {
              const isLiked = post.isLiked;
              const isOwner = post.author._id === currentUser?.id;
              
              return (
                <div
                  key={post.id}
                  className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Image
                      src={post.author.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                      alt={post.author.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{post.author.name}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <p className="text-white mb-3">{post.content}</p>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                    >
                      <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-sm">{post.likesCount}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Post Button - Only show if user is channel owner */}
        {channel.owner._id === currentUser?.id && (
          <div className="p-4">
            <button
              onClick={() => setShowCreatePostModal(true)}
              className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-black/60 transition"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-white font-medium">Post Update</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowCreatePostModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">Create Post</h2>
                <button
                  onClick={() => setShowCreatePostModal(false)}
                  className="text-gray-400 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
              />
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleCreatePost}
                disabled={creatingPost || !newPostContent.trim()}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPost ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}