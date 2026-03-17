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
import { WS_URL } from '@/config/api.config';
import { io, Socket } from 'socket.io-client';

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
  hasUrgentMessage?: boolean; // New field for urgent/important messages
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

// Profile cache outside component to persist across renders
const profileCache = new Map<string, any>();
const linkPreviewCache = new Map<string, any>();

// Component for external link previews
const ExternalLinkPreview = ({ url, theme }: { url: string; theme: string }) => {
  const [preview, setPreview] = useState<any>(() => linkPreviewCache.get(url) || null);
  const [loading, setLoading] = useState(!linkPreviewCache.has(url));

  useEffect(() => {
    // Check if cached preview has invalid images, if so refetch
    const cachedPreview = linkPreviewCache.get(url);
    const hasInvalidCachedImage = cachedPreview?.image?.startsWith('data:;base64,');

    if (linkPreviewCache.has(url) && !hasInvalidCachedImage) {
      return;
    }

    const fetchPreview = async () => {
      try {
        const response = await api.get(`/chat/link-preview?url=${encodeURIComponent(url)}`);
        if (response.data && !response.data.error) {
          linkPreviewCache.set(url, response.data);
          setPreview(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch link preview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block mt-2 rounded-lg overflow-hidden border ${
          theme === 'light'
            ? 'border-gray-300 bg-gray-50'
            : 'border-white/20 bg-white/5'
        } animate-pulse`}
      >
        <div className={`h-40 ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} />
        <div className="p-3 space-y-2">
          <div className={`h-3 rounded ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} style={{ width: '60%' }} />
          <div className={`h-4 rounded ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} style={{ width: '90%' }} />
        </div>
      </a>
    );
  }

  if (!preview || preview.error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 underline hover:opacity-80 break-all ${
          theme === 'light' ? 'text-blue-600' : 'text-blue-400'
        }`}
      >
        {url}
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  const hostname = new URL(url).hostname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-lg overflow-hidden border hover:opacity-90 transition ${
        theme === 'light'
          ? 'border-gray-200 bg-gray-50'
          : 'border-white/20 bg-white/5'
      }`}
    >
      {preview.image && (
        <div className="w-full h-40 overflow-hidden bg-gray-200">
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 mt-0.5 flex-shrink-0">
            {preview.favicon ? (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <svg className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {preview.siteName && (
              <p className={`text-xs mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {preview.siteName}
              </p>
            )}
            {preview.title && (
              <p className={`text-sm font-semibold mb-1 line-clamp-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {preview.title}
              </p>
            )}
            {preview.description && (
              <p className={`text-xs line-clamp-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {preview.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

// Component to fetch and display Tarpai profile link preview - moved outside to prevent recreation
const TarpaiLinkPreview = ({ username, url, theme }: { username: string; url: string; theme: string }) => {
  const [profileData, setProfileData] = useState<any>(() => profileCache.get(username) || null);
  const [loading, setLoading] = useState(!profileCache.has(username));

  useEffect(() => {
    // If we have cached data, don't fetch again
    if (profileCache.has(username)) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await api.get(`/users/search?query=${username}`);
        const user = response.data.find((u: any) => u.username === username);
        if (user) {
          profileCache.set(username, user); // Cache the result
          setProfileData(user);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block mt-2 rounded-lg overflow-hidden border ${
          theme === 'light'
            ? 'border-gray-300 bg-gray-50'
            : 'border-white/20 bg-white/5'
        } animate-pulse`}
      >
        <div className={`h-40 ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} />
        <div className="p-3 space-y-2">
          <div className={`h-3 rounded ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} style={{ width: '60%' }} />
          <div className={`h-4 rounded ${theme === 'light' ? 'bg-gray-200' : 'bg-white/10'}`} style={{ width: '90%' }} />
        </div>
      </a>
    );
  }

  if (!profileData) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 underline hover:opacity-80 ${
          theme === 'light' ? 'text-blue-600' : 'text-blue-400'
        }`}
      >
        @{username}
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-lg overflow-hidden border hover:opacity-90 transition ${
        theme === 'light'
          ? 'border-gray-200 bg-gray-50'
          : 'border-white/20 bg-white/5'
      }`}
    >
      {/* Avatar Banner */}
      <div className="relative h-40 bg-gradient-to-br from-pink-500 to-purple-600">
        <Image
          src={profileData.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
          alt={profileData.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Profile Info */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 mt-0.5 flex-shrink-0">
            <svg className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs mb-1 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              tarpai.onrender.com
            </p>
            <p className={`text-sm font-semibold mb-1 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {profileData.displayName || profileData.name}
            </p>
            {profileData.bio && (
              <p className={`text-xs line-clamp-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {profileData.bio}
              </p>
            )}
          </div>
        </div>
      </div>
    </a>
  );
};

export default function ChatsPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  
  console.log('🔄 ChatsPage RENDER');
  
  // Check if we navigated here via browser back button and force reload
  useEffect(() => {
    const checkForBackNavigation = () => {
      // Check if we came from a chat page (stored in sessionStorage)
      const cameFromChat = sessionStorage.getItem('cameFromChat');
      if (cameFromChat === 'true') {
        sessionStorage.removeItem('cameFromChat');
        window.location.reload();
        return;
      }
    };
    
    checkForBackNavigation();
  }, []);
  
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

  // Watch for URL changes to update active tab
  useEffect(() => {
    const checkUrlTab = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'channels' || tab === 'broadcasts') {
        setActiveTab(tab);
      } else if (!tab) {
        setActiveTab('chats');
      }
    };
    
    checkUrlTab();
  }, []);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [following, setFollowing] = useState<Follower[]>([]);
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
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [maxBroadcasts] = useState(2);
  
  // Socket connection for real-time updates
  const socketRef = useRef<Socket | null>(null);

  // Debug broadcasts state changes
  useEffect(() => {
    console.log('📊 Broadcasts state changed - Received:', receivedBroadcasts.length, 'Sent:', sentBroadcasts.length);
  }, [receivedBroadcasts, sentBroadcasts]);

  useEffect(() => {
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

    // Check URL on mount in case we navigated here with a tab parameter
    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);

    return () => {
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

    // Setup socket connection for real-time updates
    if (token) {
      const socket = io(WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'], // Allow fallback to polling
        timeout: 20000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🔌 Chats page socket connected');
        // Immediately fetch conversations when socket connects
        fetchConversations();
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 Chats page socket connection error:', error);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔌 Chats page socket reconnected after', attemptNumber, 'attempts');
        // Refresh conversations after reconnection
        fetchConversations();
      });

      // Listen for new messages to update conversation list
      socket.on('new_message', (message: any) => {
        console.log('📨 Received new message in chats page:', message);
        
        // Immediately update the conversation if we can identify it
        if (message.conversationId) {
          setConversations(prev => {
            const updated = prev.map(conv => {
              if (conv.id === message.conversationId) {
                const updatedConv = {
                  ...conv,
                  lastMessage: {
                    content: message.content,
                    type: message.type,
                    createdAt: message.createdAt,
                    sender: message.sender
                  },
                  lastActivity: message.createdAt,
                  unreadCount: conv.unreadCount + (message.sender._id !== currentUser?.id ? 1 : 0),
                  hasUrgentMessage: message.isUrgent || conv.hasUrgentMessage
                };
                console.log('📨 Updated conversation:', updatedConv.id, 'hasUrgent:', updatedConv.hasUrgentMessage);
                
                // Trigger urgent message update event if this is an urgent message
                if (message.isUrgent) {
                  console.log('📨 Triggering urgent message update event');
                  window.dispatchEvent(new CustomEvent('urgentMessageUpdate'));
                }
                
                return updatedConv;
              }
              return conv;
            });
            
            // Sort by urgent messages first, then by last activity
            return updated.sort((a, b) => {
              // First priority: urgent messages
              if (a.hasUrgentMessage && !b.hasUrgentMessage) return -1;
              if (!a.hasUrgentMessage && b.hasUrgentMessage) return 1;
              
              // Second priority: last activity time
              return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
            });
          });
        }
        
        // Also do a delayed refresh to ensure consistency with server
        setTimeout(() => {
          console.log('📨 Delayed refresh after new message');
          fetchConversations();
        }, 100);
      });

      // Listen for conversation updates (includes urgent message flags)
      socket.on('conversation_updated', (updatedConversation: any) => {
        console.log('🔄 Received conversation update in chats page:', updatedConversation);
        console.log('🔄 Updated conversation hasUrgentMessage:', updatedConversation.hasUrgentMessage);
        
        // Update the specific conversation in the list immediately for fast UI updates
        setConversations(prev => {
          const updated = prev.map(conv => 
            conv.id === updatedConversation.id ? updatedConversation : conv
          );
          // If conversation doesn't exist, add it at the top (most recent)
          if (!prev.find(conv => conv.id === updatedConversation.id)) {
            console.log('🔄 Adding new conversation:', updatedConversation.id);
            updated.unshift(updatedConversation);
          }
          // Sort by urgent messages first, then by last activity
          const sorted = updated.sort((a, b) => {
            // First priority: urgent messages
            if (a.hasUrgentMessage && !b.hasUrgentMessage) return -1;
            if (!a.hasUrgentMessage && b.hasUrgentMessage) return 1;
            
            // Second priority: last activity time
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
          });
          
          console.log('🔄 Sorted conversations, urgent ones first:', sorted.filter(c => c.hasUrgentMessage).map(c => c.id));
          
          // Trigger a custom event to notify BottomNav about urgent message changes
          if (updatedConversation.hasUrgentMessage) {
            window.dispatchEvent(new CustomEvent('urgentMessageUpdate'));
          }
          
          return sorted;
        });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Chats page socket disconnected');
      });
    }

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
        // Refresh conversations when page becomes visible again
        fetchConversations();
      }
    };

    // Handle window focus - refresh conversations when user returns to the page
    const handleWindowFocus = () => {
      fetchConversations();
    };

    // Handle browser back/forward navigation to chats page
    const handlePopState = () => {
      // Small delay to ensure the navigation has completed
      setTimeout(() => {
        if (window.location.pathname === '/chats') {
          window.location.reload();
        }
      }, 100);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('popstate', handlePopState);

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
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Unregister from chats page
      registerChatsPageStatus(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('popstate', handlePopState);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentUser, router]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      console.log('📋 Raw conversations from API:', response.data.length, 'conversations');
      console.log('📋 Urgent conversations:', response.data.filter((c: Conversation) => c.hasUrgentMessage).map((c: Conversation) => ({ id: c.id, hasUrgent: c.hasUrgentMessage })));
      
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
      
      console.log('📋 Deduplicated conversations:', uniqueConversations.length, 'conversations');
      console.log('📋 Urgent after dedup:', uniqueConversations.filter((c: Conversation) => c.hasUrgentMessage).map((c: Conversation) => ({ id: c.id, hasUrgent: c.hasUrgentMessage })));
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
    console.log('📡 fetchBroadcasts called');
    setBroadcastsLoading(true);
    try {
      // Fetch both received and sent broadcasts
      const [receivedResponse, sentResponse] = await Promise.all([
        api.get('/broadcasts/received'),
        api.get('/broadcasts')
      ]);
      
      console.log('📨 Broadcasts fetched - Received:', receivedResponse.data.broadcasts?.length, 'Sent:', sentResponse.data.broadcasts?.length);
      setReceivedBroadcasts(receivedResponse.data.broadcasts || []);
      setSentBroadcasts(sentResponse.data.broadcasts || []);
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error);
      toast.error('Failed to load broadcasts');
    } finally {
      setBroadcastsLoading(false);
    }
  };

  const fetchBroadcastCount = async () => {
    try {
      const response = await api.get('/users/broadcast-count');
      setBroadcastCount(response.data.yearlyBroadcastCount || 0);
    } catch (error) {
      console.error('Failed to fetch broadcast count:', error);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Check if user has reached broadcast limit
    if (broadcastCount >= maxBroadcasts) {
      toast.error('You have reached your yearly broadcast limit of 2');
      return;
    }

    setSendingBroadcast(true);
    try {
      const response = await api.post('/broadcasts', {
        message: broadcastMessage,
        recipientType: 'followers',
      });

      // Update broadcast count from response
      if (response.data.yearlyBroadcastCount !== undefined) {
        setBroadcastCount(response.data.yearlyBroadcastCount);
      }

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

  const fetchFollowing = async () => {
    try {
      const response = await api.get('/follows/following');
      setFollowing(response.data.following || []);
    } catch (error) {
      console.error('Failed to fetch following:', error);
      toast.error('Failed to load following');
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
      router.push(`/chat/${selectedUsers[0]}`);
    } else {
      // Multiple users - create group
      try {
        const response = await api.post('/chat/group', {
          participantIds: selectedUsers,
        });
        
        toast.success(`Group created with ${selectedUsers.length} members`);
        // Navigate to the group conversation
        router.push(`/chat/${response.data.id}`);
      } catch (error: any) {
        console.error('Failed to create group:', error);
        toast.error(error.response?.data?.message || 'Failed to create group');
      }
    }
    
    setSelectedUsers([]);
  };

  const handleOpenNewChat = async () => {
    await fetchFollowing();
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
    router.push(`/channel/${channelId}?from=channels`);
  };

  // Add effect to fetch channels when switching to channels tab
  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels();
    } else if (activeTab === 'broadcasts') {
      fetchBroadcasts();
      fetchBroadcastCount();
    }
  }, [activeTab]);

  const filteredFollowing = following.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to detect and render links in broadcast messages
  const renderBroadcastMessage = (message: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        // Extract username from tarpai URLs
        const tarpaiMatch = part.match(/https?:\/\/(?:www\.)?tarpai\.onrender\.com\/([a-zA-Z0-9_-]+)/);
        
        if (tarpaiMatch) {
          const username = tarpaiMatch[1];
          return (
            <TarpaiLinkPreview 
              key={`${username}-${index}`} 
              username={username} 
              url={part} 
              theme={theme}
            />
          );
        }
        
        // For other URLs, show rich link preview
        return <ExternalLinkPreview key={`link-${index}`} url={part} theme={theme} />;
      }
      
      // Regular text
      return part ? <span key={index}>{part}</span> : null;
    }).filter(Boolean); // Remove null values
  };

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
                ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${background})`
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
        <div className="hidden md:block absolute inset-0 bg-black/20 backdrop-blur-md"></div>
      )}

      {/* Phone container with blur effect */}
      <div className="relative z-10 flex items-start justify-center min-h-screen w-full">
        {/* Blurred background edges (phone frame effect) - hidden on mobile */}
        <div 
          className="hidden md:block absolute inset-0 backdrop-blur-xl"
          style={{ 
            maskImage: 'radial-gradient(white 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(white 30%, transparent 70%)'
          }}
        />
        
        {/* Phone container - full width on mobile */}
        <div 
          className={`relative w-full md:max-w-md h-screen md:h-[calc(100vh-2rem)] md:my-4 mx-0 md:mx-4 rounded-none md:rounded-3xl overflow-hidden flex flex-col ${
            theme === 'light' 
              ? 'bg-white/90 shadow-2xl' 
              : theme === 'dark'
              ? 'bg-black/80 shadow-2xl'
              : 'bg-black/30 backdrop-blur-md shadow-2xl'
          }`}
          style={{ 
            ...(theme === 'background' && background ? {
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : {})
          }}
        >
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
          {/* Content */}
          <div className="relative z-10 flex flex-col pb-20 min-h-0">
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
              Messages
            </button>
            {/* Channels Tab - Commented Out */}
            {/*
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
            */}
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
                    .sort((a, b) => {
                      // First priority: urgent messages
                      if (a.hasUrgentMessage && !b.hasUrgentMessage) return -1;
                      if (!a.hasUrgentMessage && b.hasUrgentMessage) return 1;
                      
                      // Second priority: last activity time
                      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
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
                          router.push(`/chat/${navigationTarget}`);
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
                          {/* Priority indicator: Only show gold dot for urgent messages */}
                          {conversation.hasUrgentMessage && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-black"></div>
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
                        <div className="flex flex-col items-end gap-2 self-start">
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

          {/* Channels Tab Content - Commented Out */}
          {/*
          {activeTab === 'channels' && (
            <div>
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
          */}

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
              ) : sentBroadcasts.length === 0 && receivedBroadcasts.filter(b => b.sender && b.sender._id && b.sender.name).length === 0 ? (
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
                            <div className={`leading-relaxed mb-3 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {renderBroadcastMessage(broadcast.message)}
                            </div>
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
                  {receivedBroadcasts.filter(b => b.sender && b.sender._id && b.sender.name).length > 0 && (
                    <div>
                      <h3 className={`text-lg font-semibold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>RECEIVED</h3>
                      <div className="space-y-3">
                        {receivedBroadcasts
                          .filter(broadcast => {
                            // Filter out broadcasts from unknown users (missing sender data)
                            if (!broadcast.sender || !broadcast.sender._id || !broadcast.sender.name) {
                              return false;
                            }
                            
                            // Apply search filter
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
                                src={broadcast.sender?.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                                alt={broadcast.sender?.name || 'User'}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                    {broadcast.sender?.displayName || broadcast.sender?.name || 'Unknown User'}
                                  </h3>
                                  <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {new Date(broadcast.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {broadcast.sender?.username && (
                                  <p className={`text-sm mb-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>@{broadcast.sender.username}</p>
                                )}
                              </div>
                            </div>
                            <div className={`leading-relaxed ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                              {renderBroadcastMessage(broadcast.message)}
                            </div>
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
          className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 w-14 h-14 backdrop-blur-md border rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 z-30 ${
            theme === 'light' 
              ? 'bg-pink-500 hover:bg-pink-600 border-pink-500' 
              : 'bg-white/20 border-white/10 hover:bg-white/30'
          }`}
          style={{
            right: 'calc((100% - 448px) / 2 + 24px)',
            left: 'auto'
          }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowCreateChannelModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowBroadcastModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
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
                <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {broadcastCount}/{maxBroadcasts}
                </span>
              </div>
              <p className="text-sm text-red-600 font-medium ml-10">2 broadcasts per year</p>
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
                placeholder="What's on your mind? This message will be sent to all your followers.&#10;&#10;⚠️ You can only send 2 broadcasts per year. Be careful what you broadcast!"
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
                disabled={sendingBroadcast || !broadcastMessage.trim() || broadcastCount >= maxBroadcasts}
                className="w-full bg-gray-800 text-white hover:bg-gray-700 py-4 rounded-2xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {sendingBroadcast ? 'Sending...' : `Send Broadcast (${broadcastCount}/${maxBroadcasts})`}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowNewChatModal(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-slide-up"
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
              {filteredFollowing.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No following found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFollowing.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => toggleUserSelection(user._id)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 cursor-pointer transition"
                    >
                      <Image
                        src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-black">{user.displayName || user.name}</h3>
                        {user.username && (
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        selectedUsers.includes(user._id) 
                          ? 'bg-black border-black' 
                          : 'border-gray-300'
                      }`}>
                        {selectedUsers.includes(user._id) && (
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

      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
    </div>
    </div>
  );
}
