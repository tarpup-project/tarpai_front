'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
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

export default function ChatsPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const [activeTab, setActiveTab] = useState<'chats' | 'channels' | 'broadcasts'>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

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

    // Initialize socket connection for real-time updates
    if (token) {
      const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
        auth: { token },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected on chats page');
        // Notify backend that user is on chats page
        socket.emit('enter_chats_page');
      });

      socket.on('new_message', (message: any) => {
        console.log('New message received on chats page:', message);
        // Refresh conversations to get updated unread counts
        fetchConversations();
      });

      socket.on('conversation_updated', () => {
        console.log('Conversation updated');
        // Refresh conversations
        fetchConversations();
      });
    }

    // Set up polling to refresh conversations every 10 seconds (reduced frequency)
    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);

    setRefreshInterval(interval);

    // Cleanup interval and socket on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (socketRef.current) {
        // Notify backend that user left chats page
        socketRef.current.emit('leave_chats_page');
        socketRef.current.disconnect();
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
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
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
    router.push(`/chat/${userId}`);
  };

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
          <div className="flex gap-2 bg-black/40 backdrop-blur-md rounded-full p-1">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'chats' ? 'bg-white text-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`flex-1 py-2 px-4 rounded-full font-medium transition ${
                activeTab === 'channels' ? 'bg-white text-black' : 'text-white hover:bg-white/10'
              }`}
            >
              Channels
            </button>
            <button
              onClick={() => setActiveTab('broadcasts')}
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
                  <button
                    onClick={handleOpenNewChat}
                    className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
                  >
                    Start New Chat
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => router.push(`/chat/${conversation.participant._id}`)}
                      className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-black/60 transition cursor-pointer"
                    >
                      <Image
                        src={conversation.participant.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                        alt={conversation.participant.name}
                        width={50}
                        height={50}
                        className="w-12 h-12 rounded-full object-cover"
                      />
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
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="text-center py-20">
              <p className="text-gray-400">Channels coming soon...</p>
            </div>
          )}

          {activeTab === 'broadcasts' && (
            <div className="text-center py-20">
              <p className="text-gray-400">Broadcasts coming soon...</p>
            </div>
          )}
        </div>
      </div>

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
