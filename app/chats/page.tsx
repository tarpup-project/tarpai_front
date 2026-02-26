'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

interface Conversation {
  id: string;
  isGroup?: boolean;
  groupName?: string;
  participants?: Array<{
    _id: string;
    name: string;
    displayName: string;
    username: string;
    avatar: string;
  }>;
  participant?: {
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
    sender?: {
      _id: string;
      name: string;
      displayName?: string;
      username: string;
      avatar: string;
    };
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
  const { theme } = useTheme();
  
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
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
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
  const [mainSearchQuery, setMainSearchQuery] = useState('');

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
      
      // Deduplicate conversations by participant ID (only for direct messages)
      const uniqueConversations = response.data.reduce((acc: Conversation[], conv: Conversation) => {
        if (conv.isGroup) {
          // Always add group conversations
          acc.push(conv);
        } else {
          // Deduplicate direct messages by participant ID
          const participantId = conv.participant?._id;
          if (participantId) {
            const existingIndex = acc.findIndex(c => !c.isGroup && c.participant?._id === participantId);
            
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
      const response = await api.get('/channels');
      setChannels(response.data);
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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleStartChat = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one person');
      return;
    }

    setShowNewChatModal(false);
    
    if (selectedUsers.length === 1) {
      // Single user - direct message
      window.location.href = `/chat/${selectedUsers[0]}`;
    } else {
      // Multiple users - create group
      try {
        const response = await api.post('/chat/group', {
          participantIds: selectedUsers,
        });
        
        toast.success(`Group created with ${selectedUsers.length} members`);
        // Navigate to the group conversation
        window.location.href = `/chat/${response.data.id}`;
      } catch (error: any) {
        console.error('Failed to create group:', error);
        toast.error(error.response?.data?.message || 'Failed to create group');
      }
    }
    
    setSelectedUsers([]);
  };

  const handleOpenNewChat = async () => {
    await fetchFollowers();
    setSelectedUsers([]);
    setShowNewChatModal(true);
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

  // Helper function to format time
  const formatMessageTime = (dateString: string) => {
    const messageDate = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time to midnight for date comparison
    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayDateOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    // Format time as HH:MM
    const timeString = messageDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    if (messageDateOnly.getTime() === todayDateOnly.getTime()) {
      // Today - show only time
      return timeString;
    } else if (messageDateOnly.getTime() === yesterdayDateOnly.getTime()) {
      // Yesterday - show "Yesterday HH:MM"
      return `Yesterday ${timeString}`;
    } else {
      // Older - show date
      return messageDate.toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen relative ${
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
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
      )}

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
              value={mainSearchQuery}
              onChange={(e) => setMainSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`w-full backdrop-blur-md border rounded-full pl-12 pr-4 py-3 placeholder-gray-400 focus:outline-none ${
                theme === 'light' 
                  ? 'bg-[#e6e6e6] border-gray-400 text-black focus:border-gray-500' 
                  : 'bg-white/10 border-white/20 text-white focus:border-white/40'
              }`}
            />
          </div>

          {/* Tabs */}
          <div className={`flex gap-2 backdrop-blur-md rounded-full p-1 mb-5 ${
            theme === 'light' 
              ? 'bg-[#e6e6e6] border border-gray-400' 
              : 'bg-white/10 border border-white/20'
          }`}>
            <button
              onClick={() => handleTabSwitch('chats')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'chats' 
                  ? theme === 'light'
                    ? 'bg-black text-white'
                    : 'bg-white/40 text-white'
                  : theme === 'light'
                    ? 'text-gray-500 hover:bg-gray-100'
                    : 'text-white hover:bg-white/10'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => handleTabSwitch('channels')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'channels' 
                  ? theme === 'light'
                    ? 'bg-black text-white'
                    : 'bg-white/40 text-white'
                  : theme === 'light'
                    ? 'text-gray-500 hover:bg-gray-100'
                    : 'text-white hover:bg-white/10'
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => handleTabSwitch('broadcasts')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'broadcasts' 
                  ? theme === 'light'
                    ? 'bg-black text-white'
                    : 'bg-white/40 text-white'
                  : theme === 'light'
                    ? 'text-gray-500 hover:bg-gray-100'
                    : 'text-white hover:bg-white/10'
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
                  {conversations
                    .filter(conversation => {
                      if (!mainSearchQuery.trim()) return true;
                      const searchLower = mainSearchQuery.toLowerCase();
                      
                      if (conversation.isGroup) {
                        return conversation.groupName?.toLowerCase().includes(searchLower);
                      } else {
                        return (
                          conversation.participant?.name?.toLowerCase().includes(searchLower) ||
                          conversation.participant?.displayName?.toLowerCase().includes(searchLower) ||
                          conversation.participant?.username?.toLowerCase().includes(searchLower)
                        );
                      }
                    })
                    .map((conversation) => {
                    // For group chats, check if any participant is active
                    const isAnyParticipantActive = conversation.isGroup 
                      ? conversation.participants?.some(p => activeUsers[conversation.id]?.[p._id])
                      : activeUsers[conversation.id]?.[conversation.participant?._id || ''] || false;
                    
                    const displayName = conversation.isGroup 
                      ? conversation.groupName 
                      : (conversation.participant?.displayName || conversation.participant?.name);
                    
                    // For group chats without messages, show "Group: Started a new chat"
                    // For direct messages without messages, show "No messages yet"
                    // For group chats with messages from others, show "SenderName: message"
                    let lastMessageDisplay = '';
                    if (conversation.lastMessage) {
                      const messageContent = conversation.lastMessage.type === 'image' 
                        ? (conversation.lastMessage.content && conversation.lastMessage.content !== 'Image' 
                            ? `📷 ${conversation.lastMessage.content}` 
                            : '📷 Photo')
                        : conversation.lastMessage.content;
                      
                      // For group chats, prepend sender name if message is from someone else
                      if (conversation.isGroup && conversation.lastMessage.sender) {
                        const isOwnMessage = conversation.lastMessage.sender._id === currentUser?.id;
                        if (isOwnMessage) {
                          lastMessageDisplay = messageContent;
                        } else {
                          const senderName = conversation.lastMessage.sender.displayName || conversation.lastMessage.sender.name;
                          lastMessageDisplay = `${senderName}: ${messageContent}`;
                        }
                      } else {
                        lastMessageDisplay = messageContent;
                      }
                    } else {
                      lastMessageDisplay = conversation.isGroup ? 'Group: Started a new chat' : 'No messages yet';
                    }
                    
                    // Determine navigation target: user ID for direct messages, conversation ID for groups
                    const navigationTarget = conversation.isGroup 
                      ? conversation.id 
                      : conversation.participant?._id;
                    
                    console.log('Conversation click:', {
                      isGroup: conversation.isGroup,
                      conversationId: conversation.id,
                      participantId: conversation.participant?._id,
                      navigationTarget,
                      groupName: conversation.groupName,
                    });
                    
                    return (
                      <div
                        key={conversation.id}
                        onClick={() => {
                          console.log('Navigating to:', `/chat/${navigationTarget}`);
                          window.location.href = `/chat/${navigationTarget}`;
                        }}
                        className={`${theme === 'light' ? 'bg-white/10' : 'bg-white/10'} backdrop-blur-md border ${theme === 'light' ? 'border-white/20' : 'border-white/10'} rounded-2xl p-4 flex items-center gap-4 ${theme === 'light' ? 'hover:bg-white/20' : 'hover:bg-white/20'} transition cursor-pointer`}
                      >
                        <div className="relative">
                          {conversation.isGroup ? (
                            // Group icon on gray background
                            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                          ) : (
                            // User avatar for direct messages
                            <Image
                              src={conversation.participant?.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                              alt={displayName || 'Chat'}
                              width={50}
                              height={50}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          {isAnyParticipantActive && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {displayName}
                          </h3>
                          {conversation.isGroup && !conversation.lastMessage ? (
                            // Group chat with no messages - show "Group:" in blue
                            <p className="text-sm truncate">
                              <span className="text-blue-400">Group:</span>
                              <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}> Started a new chat</span>
                            </p>
                          ) : (
                            // Regular message display
                            <p className={`text-sm truncate ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                              {lastMessageDisplay}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                            {formatMessageTime(conversation.lastActivity)}
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
                className={`${theme === 'light' ? 'bg-white/30 border-black/10' : 'bg-white/10 border-white/30'} backdrop-blur-md border rounded-2xl p-4 flex items-center gap-4 ${theme === 'light' ? 'hover:bg-white/20' : 'hover:bg-white/20'} transition cursor-pointer mb-6`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  theme === 'light' ? 'bg-pink-500' : 'bg-white/20'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Create New Channel</h3>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Share updates with your followers</p>
                </div>
              </div>

              {/* Your Channels Section */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>YOUR CHANNELS</h3>
                {channels.filter(channel => channel.owner._id === currentUser?.id).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">You haven't created any channels yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {channels
                      .filter(channel => channel.owner._id === currentUser?.id)
                      .filter(channel => {
                        if (!mainSearchQuery.trim()) return true;
                        const searchLower = mainSearchQuery.toLowerCase();
                        return (
                          channel.title?.toLowerCase().includes(searchLower) ||
                          channel.subtitle?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((channel) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelNavigation(channel.id)}
                        className={`backdrop-blur-md border rounded-2xl p-4 flex items-center gap-4 transition cursor-pointer ${
                          theme === 'light' 
                            ? 'bg-white/30 border-gray-300 hover:bg-gray-50' 
                            : 'bg-white/10 border-white/30 hover:bg-white/20'
                        }`}
                      >
                        <Image
                          src={channel.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                          alt={channel.title}
                          width={50}
                          height={50}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{channel.title}</h3>
                          <p className={`text-sm truncate ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{channel.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-blue-400 font-medium">Owner</span>
                          <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>ALL CHANNELS</h3>
                {channels.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No channels available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {channels
                      .filter(channel => {
                        if (!mainSearchQuery.trim()) return true;
                        const searchLower = mainSearchQuery.toLowerCase();
                        return (
                          channel.title?.toLowerCase().includes(searchLower) ||
                          channel.subtitle?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((channel) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelNavigation(channel.id)}
                        className={`backdrop-blur-md border rounded-2xl p-4 flex items-center gap-4 transition cursor-pointer ${
                          theme === 'light' 
                            ? 'bg-white/30 border-gray-300 hover:bg-gray-50' 
                            : 'bg-white/10 border-white/30 hover:bg-white/20'
                        }`}
                      >
                        <Image
                          src={channel.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                          alt={channel.title}
                          width={50}
                          height={50}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{channel.title}</h3>
                          <p className={`text-sm truncate ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{channel.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {channel.owner._id === currentUser?.id ? (
                            <span className="text-xs text-blue-400 font-medium">Owner</span>
                          ) : (
                            <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>@{channel.owner.username}</span>
                          )}
                          <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                className={`backdrop-blur-md border rounded-2xl p-4 flex items-center gap-4 transition cursor-pointer mb-6 ${
                  theme === 'light' 
                    ? 'bg-white/30 border-gray-300 hover:bg-gray-50' 
                    : 'bg-white/10 border-white/30 hover:bg-white/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  theme === 'light' ? 'bg-pink-500' : 'bg-white/20'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>New Broadcast</h3>
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Send a message to all your followers</p>
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
                      <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>SENT</h3>
                      <div className="space-y-3">
                        {sentBroadcasts
                          .filter(broadcast => {
                            if (!mainSearchQuery.trim()) return true;
                            const searchLower = mainSearchQuery.toLowerCase();
                            return broadcast.message?.toLowerCase().includes(searchLower);
                          })
                          .map((broadcast) => (
                          <div
                            key={broadcast._id}
                            className={`backdrop-blur-md border rounded-2xl p-4 ${
                              theme === 'light' 
                                ? 'bg-white/30 border-gray-300' 
                                : 'bg-white/10 border-white/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                {new Date(broadcast.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className={`leading-relaxed mb-3 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{broadcast.message}</p>
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
                      <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>RECEIVED</h3>
                      <div className="space-y-3">
                        {receivedBroadcasts
                          .filter(broadcast => {
                            if (!mainSearchQuery.trim()) return true;
                            const searchLower = mainSearchQuery.toLowerCase();
                            return (
                              broadcast.message?.toLowerCase().includes(searchLower) ||
                              broadcast.sender?.name?.toLowerCase().includes(searchLower) ||
                              broadcast.sender?.displayName?.toLowerCase().includes(searchLower) ||
                              broadcast.sender?.username?.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((broadcast) => (
                          <div
                            key={broadcast._id}
                            className={`backdrop-blur-md border rounded-2xl p-4 ${
                              theme === 'light' 
                                ? 'bg-white/30 border-gray-300' 
                                : 'bg-white/10 border-white/30'
                            }`}
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
                                  <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                    {broadcast.sender.displayName || broadcast.sender.name}
                                  </h3>
                                  <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {new Date(broadcast.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {broadcast.sender.username && (
                                  <p className={`text-sm mb-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>@{broadcast.sender.username}</p>
                                )}
                              </div>
                            </div>
                            <p className={`leading-relaxed ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{broadcast.message}</p>
                            <div className="mt-3 flex justify-end">
                              <span className={`text-xs font-medium flex items-center gap-1 ${
                                theme === 'light' ? 'text-green-700' : 'text-green-400'
                              }`}>
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
          className={`fixed bottom-24 right-6 w-14 h-14 backdrop-blur-md border rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-30 ${
            theme === 'light' 
              ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' 
              : 'bg-white/20 border-white/10 hover:bg-white/30'
          }`}
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
                <h2 className="text-xl font-bold text-black">Create New Channel</h2>
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Channel Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {channelForm.avatar ? (
                        <Image
                          src={URL.createObjectURL(channelForm.avatar)}
                          alt="Channel avatar preview"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
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
                      className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition text-sm"
                    >
                      Select Image
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Channel Title
                  </label>
                  <input
                    type="text"
                    value={channelForm.title}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="My Updates"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-black text-sm placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Channel Subtitle
                  </label>
                  <input
                    type="text"
                    value={channelForm.subtitle}
                    onChange={(e) => setChannelForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Official updates from me"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-black text-sm placeholder-gray-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={handleCreateChannel}
                disabled={creatingChannel || !channelForm.title.trim() || !channelForm.subtitle.trim() || !channelForm.avatar}
                className="w-full bg-black text-white py-3 rounded-2xl text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
            className={`bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>New Broadcast</h2>
              </div>
            </div>

            {/* To Field */}
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} font-medium`}>To:</span>
                <span className={`${theme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full text-sm font-medium`}>
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
                className={`w-full h-full min-h-[300px] ${theme === 'dark' ? 'text-white placeholder-gray-500 bg-transparent' : 'text-black placeholder-gray-400 bg-transparent'} focus:outline-none resize-none text-lg`}
              />
            </div>

            {/* Footer */}
            <div className={`p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {broadcastMessage.length}/500
                </span>
              </div>
              
              <button
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                className={`w-full ${theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-800 text-white hover:bg-gray-700'} py-4 rounded-2xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
              </button>
              
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center mt-3`}>
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
                  onClick={() => {
                    setShowNewChatModal(false);
                    setSelectedUsers([]);
                  }}
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
                      onClick={() => toggleUserSelection(follower._id)}
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
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        selectedUsers.includes(follower._id) 
                          ? 'bg-black border-black' 
                          : 'border-gray-300'
                      }`}>
                        {selectedUsers.includes(follower._id) && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start Chat Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleStartChat}
                disabled={selectedUsers.length === 0}
                className="w-full bg-black text-white py-4 rounded-full font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat {selectedUsers.length > 0 && `(${selectedUsers.length})`}
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
