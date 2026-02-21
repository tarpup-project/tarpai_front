'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

interface Conversation {
  id: string;
  participant: {
    _id: string;
    name: string;
    displayName: string;
    username: string;
    avatar: string;
  };
  lastMessage: {
    content: string;
    type?: string;
    createdAt: string;
  };
  unreadCount: number;
  lastActivity: string;
}

interface Follower {
  _id: string;
  name: string;
  displayName: string;
  username: string;
  avatar: string;
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
  createdAt: string;
}

interface Broadcast {
  _id: string;
  message: string;
  sender: {
    _id: string;
    name: string;
    displayName: string;
    username: string;
    avatar: string;
  };
  createdAt: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  
  // Read tab from URL parameter, default to 'chats'
  const getInitialTab = (): 'chats' | 'channels' | 'broadcasts' => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'channels' || tab === 'broadcasts') {
        return tab;
      }
    }
    return 'chats';
  };
  
  const [activeTab, setActiveTab] = useState<'chats' | 'channels' | 'broadcasts'>(getInitialTab());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUsers, setActiveUsers] = useState<{ [conversationId: string]: { [participantId: string]: boolean } }>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [channelForm, setChannelForm] = useState({
    title: '',
    subtitle: '',
    avatar: null as File | null,
  });
  const [creatingChannel, setCreatingChannel] = useState(false);
  const channelFileInputRef = useRef<HTMLInputElement>(null);
  const [receivedBroadcasts, setReceivedBroadcasts] = useState<Broadcast[]>([]);
  const [sentBroadcasts, setSentBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/chats' || currentPath.startsWith('/chat/')) {
        window.location.reload();
      }
    };

    // Handle URL parameter changes for tab switching
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'channels' || tab === 'broadcasts') {
        setActiveTab(tab);
      } else {
        setActiveTab('chats');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('popstate', handleUrlChange);
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

    fetchConversations();

    // Fetch channels when activeTab is channels
    if (activeTab === 'channels') {
      fetchChannels();
    }

    // Register that user is on chats page
    registerChatsPageStatus(true);

    // Handle page unload/navigation away
    const handleBeforeUnload = () => {
      registerChatsPageStatus(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerChatsPageStatus(false);
      } else {
        registerChatsPageStatus(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up polling to refresh conversations and check active users every 10 seconds
    const interval = setInterval(() => {
      fetchConversations();
      // Re-register chats page status to keep it active (only if page is visible)
      if (!document.hidden) {
        registerChatsPageStatus(true);
      }
    }, 10000);

    // Cleanup interval on unmount
    return () => {
      // Unregister from chats page
      registerChatsPageStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentUser, router]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      console.log('Raw conversations:', response.data);
      
      // Deduplicate conversations by participant ID
      const uniqueConversations = response.data.reduce((acc: Conversation[], conv: Conversation) => {
        const participantId = conv.participant._id;
        const existingIndex = acc.findIndex(c => c.participant._id === participantId);
        
        if (existingIndex === -1) {
          // New participant, add conversation
          acc.push(conv);
        } else {
          // Duplicate participant, keep the one with more recent activity
          const existing = acc[existingIndex];
          const existingDate = new Date(existing.lastActivity).getTime();
          const newDate = new Date(conv.lastActivity).getTime();
          
          if (newDate > existingDate) {
            acc[existingIndex] = conv;
          }
        }
        
        return acc;
      }, []);
      
      console.log('Deduplicated conversations:', uniqueConversations);
      setConversations(uniqueConversations);
      
      // Check active users after conversations are loaded
      if (uniqueConversations.length > 0) {
        checkActiveUsersForConversations(uniqueConversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveUsers = async () => {
    if (conversations.length === 0) return;
    checkActiveUsersForConversations(conversations);
  };

  const checkActiveUsersForConversations = async (convs: Conversation[]) => {
    try {
      const conversationIds = convs.map(conv => conv.id);
      const response = await api.post('/chat/check-active-users', { conversationIds });
      setActiveUsers(response.data);
    } catch (error) {
      console.error('Failed to check active users:', error);
    }
  };

  const registerChatsPageStatus = async (isOnChatsPage: boolean) => {
    try {
      await api.post('/chat/chats-page-status', { isOnChatsPage });
    } catch (error) {
      console.error('Failed to register chats page status:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch('http://localhost:3000/channels');
      const data = await response.json();
      setChannels(data);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      toast.error('Failed to load channels');
    }
  };

  const fetchBroadcasts = async () => {
    setBroadcastsLoading(true);
    try {
      // Fetch both received and sent broadcasts
      const [receivedResponse, sentResponse] = await Promise.all([
        api.get('/broadcasts/received'),
        api.get('/broadcasts')
      ]);
      
      setReceivedBroadcasts(receivedResponse.data.broadcasts || []);
      setSentBroadcasts(sentResponse.data.broadcasts || []);
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
      toast.error('Failed to load broadcasts');
    } finally {
      setBroadcastsLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingBroadcast(true);
    try {
      await api.post('/broadcasts', {
        message: broadcastMessage,
        recipientType: 'followers',
      });

      toast.success('Broadcast sent successfully!');
      setBroadcastMessage('');
      setShowBroadcastModal(false);
      
      // Optionally refresh broadcasts list
      fetchBroadcasts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelForm.title.trim() || !channelForm.subtitle.trim() || !channelForm.avatar) {
      toast.error('Please fill in all fields and select an avatar');
      return;
    }

    setCreatingChannel(true);
    try {
      const formData = new FormData();
      formData.append('title', channelForm.title);
      formData.append('subtitle', channelForm.subtitle);
      formData.append('avatar', channelForm.avatar);

      const response = await api.post('/channels', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Channel created successfully!');
      setShowCreateChannelModal(false);
      setChannelForm({ title: '', subtitle: '', avatar: null });
      fetchChannels(); // Refresh channels list
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create channel');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleChannelAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setChannelForm(prev => ({ ...prev, avatar: file }));
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await api.get('/follows/followers');
      setFollowers(response.data.followers || []);
    } catch (error) {
      console.error('Failed to fetch followers:', error);
      toast.error('Failed to load followers');
    }
  };

  const handleOpenNewChat = async () => {
    await fetchFollowers();
    setShowNewChatModal(true);
  };

  const handleStartChat = (userId: string) => {
    setShowNewChatModal(false);
    window.location.href = `/chat/${userId}`;
  };

  const handleChatNavigation = (userId: string) => {
    window.location.href = `/chat/${userId}`;
  };

  const handleTabSwitch = (tab: 'chats' | 'channels' | 'broadcasts') => {
    setActiveTab(tab);
    // Update URL without page reload
    const url = new URL(window.location.href);
    if (tab === 'chats') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleChannelNavigation = (channelId: string) => {
    window.location.href = `/channel/${channelId}?from=channels`;
  };

  // Add effect to fetch channels when switching to channels tab
  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels();
    } else if (activeTab === 'broadcasts') {
      fetchBroadcasts();
    }
  }, [activeTab]);

  const filteredFollowers = followers.filter(follower =>
    follower.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
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
        <AppHeader />

        <div className="px-2">
          <h1 className="text-3xl font-bold mb-6">Chats</h1>

          {/* Search */}
          <div className="relative mb-6">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-full pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-black/40 backdrop-blur-md rounded-full p-1 mb-5">
            <button
              onClick={() => handleTabSwitch('chats')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'chats' ? 'bg-white text-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => handleTabSwitch('channels')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'channels' ? 'bg-white text-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => handleTabSwitch('broadcasts')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'broadcasts' ? 'bg-white text-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Broadcasts
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-2">
          {activeTab === 'chats' && (
            <div>
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
                  <p className="text-gray-400 text-center mb-6">Start chatting with your followers</p>
                  <p className="text-gray-400 text-center text-sm">Tap the + button to start a new chat</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conversation) => {
                    const isParticipantActive = activeUsers[conversation.id]?.[conversation.participant._id] || false;
                    
                    return (
                      <div
                        key={conversation.id}
                        onClick={() => handleChatNavigation(conversation.participant._id)}
                        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-black/60 transition cursor-pointer"
                      >
                        <div className="relative">
                          <Image
                            src={conversation.participant.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                            alt={conversation.participant.name}
                            width={50}
                            height={50}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {isParticipantActive && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {conversation.participant.displayName || conversation.participant.name}
                          </h3>
                          <p className="text-sm text-gray-400 truncate">
                            {conversation.lastMessage ? (
                              conversation.lastMessage.type === 'image' ? (
                                conversation.lastMessage.content && conversation.lastMessage.content !== 'Image' ? (
                                  `📷 ${conversation.lastMessage.content}`
                                ) : (
                                  '📷 Photo'
                                )
                              ) : (
                                conversation.lastMessage.content
                              )
                            ) : (
                              'No messages yet'
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-400">
                            {new Date(conversation.lastActivity).toLocaleDateString()}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <div className="min-w-[24px] h-6 bg-white rounded-full flex items-center justify-center px-2">
                              <span className="text-xs font-bold text-black">
                                {conversation.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (
            <div>
              {/* Create New Channel Button */}
              <div 
                onClick={() => setShowCreateChannelModal(true)}
                className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-black/60 transition cursor-pointer mb-6"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Create New Channel</h3>
                  <p className="text-sm text-gray-400">Share updates with your followers</p>
                </div>
              </div>

              {/* Your Channels Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">YOUR CHANNELS</h3>
                {channels.filter(channel => channel.owner._id === currentUser?.id).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">You haven't created any channels yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {channels.filter(channel => channel.owner._id === currentUser?.id).map((channel) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelNavigation(channel.id)}
                        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-black/60 transition cursor-pointer"
                      >
                        <Image
                          src={channel.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                          alt={channel.title}
                          width={50}
                          height={50}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-white">{channel.title}</h3>
                          <p className="text-sm text-gray-400 truncate">{channel.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-blue-400 font-medium">Owner</span>
                          <span className="text-xs text-gray-400">
                            {channel.subscribersCount} subs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Channels Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">ALL CHANNELS</h3>
                {channels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No channels available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelNavigation(channel.id)}
                        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-black/60 transition cursor-pointer"
                      >
                        <Image
                          src={channel.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                          alt={channel.title}
                          width={50}
                          height={50}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-white">{channel.title}</h3>
                          <p className="text-sm text-gray-400 truncate">{channel.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {channel.owner._id === currentUser?.id ? (
                            <span className="text-xs text-blue-400 font-medium">Owner</span>
                          ) : (
                            <span className="text-xs text-gray-400">@{channel.owner.username}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {channel.subscribersCount} subs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'broadcasts' && (
            <div>
              {/* New Broadcast Button */}
              <div 
                onClick={() => setShowBroadcastModal(true)}
                className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-black/60 transition cursor-pointer mb-6"
              >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">New Broadcast</h3>
                  <p className="text-sm text-gray-400">Send a message to all your followers</p>
                </div>
              </div>

              {broadcastsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              ) : sentBroadcasts.length === 0 && receivedBroadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No broadcasts yet</h3>
                  <p className="text-gray-400 text-center">You haven't sent or received any broadcasts</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Sent Broadcasts Section */}
                  {sentBroadcasts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">SENT</h3>
                      <div className="space-y-3">
                        {sentBroadcasts.map((broadcast) => (
                          <div
                            key={broadcast._id}
                            className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-gray-400">
                                {new Date(broadcast.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-white leading-relaxed mb-3">{broadcast.message}</p>
                            <div className="flex justify-end">
                              <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Sent
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Received Broadcasts Section */}
                  {receivedBroadcasts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">RECEIVED</h3>
                      <div className="space-y-3">
                        {receivedBroadcasts.map((broadcast) => (
                          <div
                            key={broadcast._id}
                            className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4"
                          >
                            <div className="flex items-start gap-3 mb-3">
                              <Image
                                src={broadcast.sender.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                                alt={broadcast.sender.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold text-white">
                                    {broadcast.sender.displayName || broadcast.sender.name}
                                  </h3>
                                  <span className="text-xs text-gray-400">
                                    {new Date(broadcast.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {broadcast.sender.username && (
                                  <p className="text-sm text-gray-400 mb-2">@{broadcast.sender.username}</p>
                                )}
                              </div>
                            </div>
                            <p className="text-white leading-relaxed">{broadcast.message}</p>
                            <div className="mt-3 flex justify-end">
                              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Received
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Plus Button - Only show on chats tab */}
      {activeTab === 'chats' && (
        <button
          onClick={handleOpenNewChat}
          className="fixed bottom-24 right-6 w-14 h-14 bg-black/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:bg-black/60 z-30"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowCreateChannelModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">Create New Channel</h2>
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  className="text-gray-400 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {channelForm.avatar ? (
                        <Image
                          src={URL.createObjectURL(channelForm.avatar)}
                          alt="Avatar preview"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <input
                      ref={channelFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleChannelAvatarSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => channelFileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Select Image
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Title
                  </label>
                  <input
                    type="text"
                    value={channelForm.title}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="My Updates"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel Subtitle
                  </label>
                  <input
                    type="text"
                    value={channelForm.subtitle}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Official updates from me"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleCreateChannel}
                disabled={creatingChannel || !channelForm.title.trim() || !channelForm.subtitle.trim() || !channelForm.avatar}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingChannel ? 'Creating...' : 'Create Channel'}
              </button>
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
                  All Followers
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
                className="w-full h-full min-h-[300px] text-black placeholder-gray-400 focus:outline-none resize-none text-lg"
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
                className="w-full bg-gray-800 text-white py-4 rounded-2xl font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowNewChatModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-black">New Message</h2>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-gray-400 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  className="w-full bg-gray-100 border-0 rounded-xl pl-12 pr-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredFollowers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No followers found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFollowers.map((follower) => (
                    <div
                      key={follower._id}
                      onClick={() => handleStartChat(follower._id)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition"
                    >
                      <Image
                        src={follower.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                        alt={follower.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-black">{follower.displayName || follower.name}</h3>
                        {follower.username && (
                          <p className="text-sm text-gray-500">@{follower.username}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
