'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import Image from 'next/image';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface Message {
  _id: string;
  sender: string;
  content: string;
  createdAt: string;
}

interface ChatUser {
  _id: string;
  name: string;
  displayName: string;
  username: string;
  avatar: string;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    initializeChat();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId, currentUser, router]);

  const initializeChat = async () => {
    try {
      // Fetch the other user's details
      const userResponse = await api.get(`/users/${userId}`);
      setChatUser(userResponse.data);

      // Create or get conversation
      const conversationResponse = await api.post('/chat/conversations', {
        participantId: userId,
      });
      const conversationId = conversationResponse.data.id;

      // Initialize socket connection
      const token = localStorage.getItem('token');
      const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
        auth: { token },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected');
        // Join the conversation room
        socket.emit('join_conversation', { conversationId });
        // Request online status of the other user immediately
        socket.emit('check_user_status', { userId });
        // Check again after 1 second to catch users who joined after us
        setTimeout(() => {
          socket.emit('check_user_status', { userId });
        }, 1000);
      });

      socket.on('user_status', (data: { userId: string; isOnline: boolean }) => {
        console.log('User status:', data);
        if (data.userId === userId) {
          setIsOnline(data.isOnline);
        }
      });

      socket.on('user_online', (data: { userId: string }) => {
        console.log('User online:', data.userId);
        if (data.userId === userId) {
          setIsOnline(true);
        }
      });

      socket.on('user_offline', (data: { userId: string }) => {
        console.log('User offline:', data.userId);
        if (data.userId === userId) {
          setIsOnline(false);
        }
      });

      socket.on('new_message', (message: any) => {
        console.log('Received new message:', message);
        setMessages(prev => {
          // Check if this is a duplicate real message
          if (prev.some(m => m._id === message.id)) {
            return prev;
          }
          
          // Remove temp message with same content if it exists (our optimistic update)
          const filteredMessages = prev.filter(m => 
            !(m._id.startsWith('temp-') && m.content === message.content && m.sender === (message.sender._id || message.sender))
          );
          
          return [...filteredMessages, {
            _id: message.id,
            sender: message.sender._id || message.sender,
            content: message.content,
            createdAt: message.createdAt,
          }];
        });
        scrollToBottom();
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      // Fetch conversation history
      try {
        const messagesResponse = await api.get(`/chat/conversations/${conversationId}/messages`);
        setMessages(messagesResponse.data.messages.map((msg: any) => ({
          _id: msg.id,
          sender: msg.sender._id || msg.sender,
          content: msg.content,
          createdAt: msg.createdAt,
        })));
        scrollToBottom();
      } catch (error) {
        console.log('No previous messages');
      }

      // Store conversationId for sending messages
      (socketRef.current as any).conversationId = conversationId;

      // Check if user is currently online by checking if they're in the connected users
      // We'll assume offline initially and let the socket events update it
      setIsOnline(false);
    } catch (error: any) {
      console.error('Failed to initialize chat:', error);
      toast.error('Failed to start chat');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !socketRef.current) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    
    try {
      const conversationId = (socketRef.current as any).conversationId;
      
      if (!conversationId) {
        toast.error('Conversation not initialized');
        return;
      }

      const messageData = {
        conversationId,
        content: messageContent,
        type: 'text',
      };

      console.log('Sending message:', messageData);
      
      // Add message optimistically to UI
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        sender: currentUser?.id || '',
        content: messageContent,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempMessage]);
      
      socketRef.current.emit('send_message', messageData);
      scrollToBottom();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!chatUser) {
    return null;
  }

  return (
    <div 
      className="min-h-screen text-white flex flex-col relative"
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-md border-b border-white/10 p-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <Image
            src={chatUser.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
            alt={chatUser.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />

          <div className="flex-1">
            <h2 className="font-semibold">{chatUser.displayName || chatUser.name}</h2>
            {isOnline ? (
              <p className="text-xs text-green-500">Active now</p>
            ) : (
              <p className="text-xs text-gray-400">Offline</p>
            )}
          </div>

          <button className="text-gray-300 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender === currentUser?.id;
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isOwn
                      ? 'bg-white text-black'
                      : 'bg-black/60 backdrop-blur-md text-white border border-white/10'
                  }`}
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <p className="flex-1 min-w-0">{message.content}</p>
                    <span className={`text-xs whitespace-nowrap ml-auto ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-black/40 backdrop-blur-md text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-white/10 placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
