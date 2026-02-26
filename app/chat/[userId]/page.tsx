'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import api from '@/lib/api';
import { WS_URL } from '@/config/api.config';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import ImageCropper from '@/components/ImageCropper';

interface Message {
  _id: string;
  sender: string;
  content: string;
  type?: string;
  fileUrl?: string;
  createdAt: string;
  replyTo?: {
    _id: string;
    sender: string;
    content: string;
  };
}

interface ChatUser {
  _id: string;
  name: string;
  displayName: string;
  username: string;
  avatar: string;
}

interface GroupInfo {
  id: string;
  isGroup: boolean;
  groupName: string;
  participants: ChatUser[];
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string; // Could be userId or conversationId
  const currentUser = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/chats' || currentPath.startsWith('/chat/')) {
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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
        // Leave the conversation before disconnecting
        const conversationId = (socketRef.current as any).conversationId;
        if (conversationId) {
          socketRef.current.emit('leave_conversation', { conversationId });
        }
        socketRef.current.disconnect();
      }
    };
  }, [userId, currentUser, router]);

  const initializeChat = async () => {
    try {
      let conversationId: string;
      let isGroup = false;
      
      console.log('=== INITIALIZING CHAT ===');
      console.log('userId param:', userId);
      
      // First, try to fetch as a user ID (direct message)
      try {
        console.log('Attempting to fetch as user ID...');
        const userResponse = await api.get(`/users/${userId}`);
        console.log('User found:', userResponse.data);
        setChatUser(userResponse.data);
        setIsGroupChat(false);

        // Create or get conversation
        console.log('Creating/getting conversation with user...');
        const conversationResponse = await api.post('/chat/conversations', {
          participantId: userId,
        });
        console.log('Conversation response:', conversationResponse.data);
        conversationId = conversationResponse.data.id;
        isGroup = false;
      } catch (userError: any) {
        console.log('Failed to fetch as user:', userError.response?.status, userError.response?.data);
        // If fetching as user fails, try as conversation ID (group chat)
        try {
          console.log('Attempting to fetch as conversation ID...');
          const convResponse = await api.get(`/chat/conversations/${userId}`);
          console.log('Conversation found:', convResponse.data);
          conversationId = convResponse.data.id;
          
          if (convResponse.data.isGroup) {
            // Group chat
            console.log('Setting up group chat...');
            setIsGroupChat(true);
            isGroup = true;
            setGroupInfo({
              id: convResponse.data.id,
              isGroup: true,
              groupName: convResponse.data.groupName,
              participants: convResponse.data.participants,
            });
          } else {
            // Direct message - set the other participant
            console.log('Setting up direct message from conversation...');
            setIsGroupChat(false);
            isGroup = false;
            setChatUser(convResponse.data.participant);
          }
        } catch (convError: any) {
          console.error('Failed to initialize chat:', convError.response?.status, convError.response?.data);
          toast.error('User or conversation not found');
          router.push('/chats');
          return;
        }
      }

      // Mark messages as read
      try {
        await api.put(`/chat/conversations/${conversationId}/read`);
        console.log('Messages marked as read');
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }

      // Initialize socket connection
      const token = localStorage.getItem('token');
      const socket = io(WS_URL, {
        auth: { token },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected, isGroup:', isGroup);
        // Join the conversation room and get existing viewers
        socket.emit('join_conversation', { conversationId }, (response: any) => {
          console.log('Join conversation response:', response);
          // For direct messages, check if the other user is viewing
          if (!isGroup && response?.existingViewers && response.existingViewers.includes(userId)) {
            setIsOnline(true);
          }
        });
        
        // Only check for online status in direct messages, not group chats
        if (!isGroup) {
          // Check if the other user is viewing after 500ms
          setTimeout(() => {
            socket.emit('check_conversation_viewer', { conversationId, userId });
          }, 500);
          
          // Check again after 2 seconds to catch late joiners
          setTimeout(() => {
            socket.emit('check_conversation_viewer', { conversationId, userId });
          }, 2000);
        }
      });

      socket.on('conversation_viewer_status', (data: { conversationId: string; userId: string; isViewing: boolean }) => {
        console.log('Conversation viewer status:', data);
        // Only update online status for direct messages
        if (!isGroup && data.conversationId === conversationId && data.userId === userId) {
          setIsOnline(data.isViewing);
        }
      });

      socket.on('user_joined_conversation', (data: { conversationId: string; userId: string }) => {
        console.log('User joined conversation:', data);
        // Only update online status for direct messages
        if (!isGroup && data.conversationId === conversationId && data.userId === userId) {
          setIsOnline(true);
        }
      });

      socket.on('user_left_conversation', (data: { conversationId: string; userId: string }) => {
        console.log('User left conversation:', data);
        if (data.conversationId === conversationId && data.userId === userId) {
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
            type: message.type,
            fileUrl: message.fileUrl,
            createdAt: message.createdAt,
            replyTo: message.replyTo ? {
              _id: message.replyTo.id,
              sender: message.replyTo.sender,
              content: message.replyTo.content,
            } : undefined,
          }];
        });
        
        // Automatically mark as read if we're viewing this conversation
        const conversationId = (socketRef.current as any).conversationId;
        if (conversationId && message.sender._id !== currentUser?.id) {
          // Mark the message as read immediately
          api.put(`/chat/conversations/${conversationId}/read`).catch(err => {
            console.error('Failed to mark message as read:', err);
          });
        }
        
        scrollToBottom();
      });

      socket.on('message_deleted', (data: { messageId: string; conversationId: string }) => {
        console.log('Message deleted:', data);
        setMessages(prev => prev.filter(m => m._id !== data.messageId));
        // Clear selection if deleted message was selected
        setSelectedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.messageId);
          return newSet;
        });
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
          type: msg.type,
          fileUrl: msg.fileUrl,
          createdAt: msg.createdAt,
          replyTo: msg.replyTo ? {
            _id: msg.replyTo.id,
            sender: msg.replyTo.sender,
            content: msg.replyTo.content,
          } : undefined,
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
    if ((!newMessage.trim() && !selectedImage) || !socketRef.current) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    
    try {
      const conversationId = (socketRef.current as any).conversationId;
      
      if (!conversationId) {
        toast.error('Conversation not initialized');
        return;
      }

      // If there's an image, upload it via REST API
      if (selectedImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('content', messageContent || 'Image');
        formData.append('type', 'image');
        if (replyingTo) {
          formData.append('replyTo', replyingTo._id);
        }

        try {
          await api.post(`/chat/conversations/${conversationId}/messages`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          setSelectedImage(null);
          setImagePreview(null);
          setReplyingTo(null);
          toast.success('Image sent');
        } catch (error) {
          console.error('Failed to send image:', error);
          toast.error('Failed to send image');
        } finally {
          setUploadingImage(false);
        }
      } else {
        // Send text message via socket
        const messageData: any = {
          conversationId,
          content: messageContent,
          type: 'text',
        };

        // Add reply information if replying to a message
        if (replyingTo) {
          messageData.replyTo = replyingTo._id;
        }

        console.log('Sending message:', messageData);
        
        // Add message optimistically to UI
        const tempMessage: Message = {
          _id: `temp-${Date.now()}`,
          sender: currentUser?.id || '',
          content: messageContent,
          createdAt: new Date().toISOString(),
          replyTo: replyingTo ? {
            _id: replyingTo._id,
            sender: replyingTo.sender,
            content: replyingTo.content,
          } : undefined,
        };
        setMessages(prev => [...prev, tempMessage]);
        
        socketRef.current.emit('send_message', messageData);
        setReplyingTo(null); // Clear reply state
      }
      
      scrollToBottom();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setImageToCrop(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkipCrop = () => {
    // Use the original image without cropping
    if (imageToCrop) {
      // Convert data URL back to file
      fetch(imageToCrop)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          setSelectedImage(file);
          setImagePreview(imageToCrop);
          setShowCropper(false);
          setImageToCrop(null);
          
          // Clear file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        });
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
    setSelectedImage(croppedFile);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    
    // Close cropper
    setShowCropper(false);
    setImageToCrop(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipedMessageId(message._id);
    
    // Start long press timer for selection mode
    if (selectedMessages.size === 0) {
      const timer = setTimeout(() => {
        setSelectedMessages(new Set([message._id]));
      }, 500); // 500ms long press
      setLongPressTimer(timer);
    }
  };

  const handleTouchMove = (e: React.TouchEvent, messageId: string, isOwn: boolean) => {
    // Cancel long press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Don't allow swipe in selection mode
    if (selectedMessages.size > 0) {
      return;
    }
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    
    // Only allow swipe in the correct direction
    // Left messages: swipe right (positive diff)
    // Right messages: swipe left (negative diff)
    if ((isOwn && diff < 0) || (!isOwn && diff > 0)) {
      // Limit swipe distance to 80px
      const limitedDiff = Math.max(Math.min(Math.abs(diff), 80), 0);
      setSwipeOffset(isOwn ? -limitedDiff : limitedDiff);
    }
  };

  const handleTouchEnd = (message: Message) => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // If swiped more than 60px, trigger reply (only if not in selection mode)
    if (Math.abs(swipeOffset) > 60 && selectedMessages.size === 0) {
      setReplyingTo(message);
    }
    
    // Reset swipe state
    setSwipeOffset(0);
    setTimeout(() => {
      setSwipedMessageId(null);
    }, 200);
  };

  const handleMessageClick = (messageId: string) => {
    if (selectedMessages.size > 0) {
      // Toggle selection
      const newSelected = new Set(selectedMessages);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      setSelectedMessages(newSelected);
    }
  };

  const handleDeleteMessages = async () => {
    if (selectedMessages.size === 0 || !socketRef.current) return;
    
    // Check if any selected messages are not owned by current user
    const selectedMessageObjects = messages.filter(m => selectedMessages.has(m._id));
    const hasOtherUsersMessages = selectedMessageObjects.some(m => m.sender !== currentUser?.id);
    
    if (hasOtherUsersMessages) {
      toast.error('You can only delete your own messages');
      return;
    }
    
    try {
      const conversationId = (socketRef.current as any).conversationId;
      
      if (!conversationId) {
        toast.error('Conversation not initialized');
        return;
      }

      // Delete each selected message via socket
      for (const messageId of selectedMessages) {
        socketRef.current.emit('delete_message', { 
          messageId, 
          conversationId 
        });
      }
      
      // Update local state immediately (optimistic update)
      setMessages(prev => prev.filter(m => !selectedMessages.has(m._id)));
      setSelectedMessages(new Set());
      toast.success(`Deleted ${selectedMessages.size} message${selectedMessages.size > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to delete messages:', error);
      toast.error('Failed to delete messages');
    }
  };

  const handleCancelSelection = () => {
    setSelectedMessages(new Set());
  };

  const handleBackNavigation = () => {
    router.back();
  };

  const handleReplyClick = (replyToId: string) => {
    // Find the message element and scroll to it
    const messageElement = messageRefs.current[replyToId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the message briefly
      setHighlightedMessageId(replyToId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!chatUser && !groupInfo) {
    return null;
  }

  return (
    <div 
      className={`min-h-screen flex flex-col relative ${
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
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div 
          className={`backdrop-blur-md border-b p-4 flex items-center gap-3 ${
            theme === 'light' 
              ? 'border-gray-300' 
              : 'border-white/10'
          }`}
          style={
            theme === 'light'
              ? {
                  background: 'linear-gradient(to bottom, #4a4a4a, #2d2d2d)',
                }
              : {
                  background: 'rgba(0, 0, 0, 0.4)',
                }
          }
        >
          {selectedMessages.size > 0 ? (
            <>
              {/* Selection Mode Header */}
              <button
                onClick={handleCancelSelection}
                className="text-gray-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex-1">
                <h2 className={`font-semibold ${theme === 'light' ? 'text-white' : 'text-white'}`}>{selectedMessages.size} selected</h2>
              </div>

              <button
                onClick={handleDeleteMessages}
                className="text-red-500 hover:text-red-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          ) : (
            <>
              {/* Normal Header */}
              <button
                onClick={handleBackNavigation}
                className="text-gray-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {isGroupChat && groupInfo ? (
                <>
                  {/* Group Chat Header */}
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className={`font-semibold truncate ${theme === 'light' ? 'text-white' : 'text-white'}`}>{groupInfo.groupName}</h2>
                    <p className={`text-xs ${theme === 'light' ? 'text-gray-300' : 'text-gray-400'}`}>{groupInfo.participants.length} members</p>
                  </div>
                </>
              ) : chatUser ? (
                <>
                  {/* Direct Message Header */}
                  <Image
                    src={chatUser.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                    alt={chatUser.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <h2 className={`font-semibold truncate ${theme === 'light' ? 'text-white' : 'text-white'}`}>{chatUser.displayName || chatUser.name}</h2>
                    {isOnline ? (
                      <p className={`text-xs ${theme === 'light' ? 'text-gray-300' : 'text-gray-400'}`}>Online</p>
                    ) : (
                      <p className={`text-xs ${theme === 'light' ? 'text-gray-300' : 'text-gray-400'}`}>Offline</p>
                    )}
                  </div>
                </>
              ) : null}

              <button 
                onClick={(e) => {
                  if (showChatMenu) {
                    setShowChatMenu(false);
                    setMenuPosition(null);
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuPosition({
                      top: rect.bottom + 4,
                      right: window.innerWidth - rect.right
                    });
                    setShowChatMenu(true);
                  }
                }}
                className={`${theme === 'light' ? 'text-white hover:text-gray-200' : 'text-gray-300 hover:text-white'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender === currentUser?.id;
            const isHighlighted = highlightedMessageId === message._id;
            const isSelected = selectedMessages.has(message._id);
            const isImageMessage = message.type === 'image' && message.fileUrl;
            
            // Get sender info for group chats
            const messageSender = isGroupChat && groupInfo && !isOwn
              ? groupInfo.participants.find(p => p._id === message.sender)
              : null;
            
            return (
              <div
                key={message._id}
                ref={(el) => { messageRefs.current[message._id] = el; }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-center gap-2`}
              >
                {selectedMessages.size > 0 && (
                  <div 
                    onClick={() => handleMessageClick(message._id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
                <div className="flex flex-col items-start max-w-[70%]">
                  {/* Show sender name in group chats for messages from others */}
                  {isGroupChat && !isOwn && messageSender && (
                    <span className={`text-xs ml-3 mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                      {messageSender.displayName || messageSender.name}
                    </span>
                  )}
                  <div
                    onTouchStart={(e) => handleTouchStart(e, message)}
                    onTouchMove={(e) => handleTouchMove(e, message._id, isOwn)}
                    onTouchEnd={() => handleTouchEnd(message)}
                    onClick={() => handleMessageClick(message._id)}
                    style={{
                      transform: swipedMessageId === message._id ? `translateX(${swipeOffset}px)` : 'none',
                      transition: swipedMessageId === message._id && swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
                    }}
                    className={`rounded-2xl ${isImageMessage ? 'p-1' : 'px-4 py-2'} relative ${
                      isOwn
                        ? 'bg-white text-black'
                        : theme === 'light'
                          ? 'bg-gray-800 text-white'
                          : 'bg-white/10 backdrop-blur-md text-white border border-white/30'
                    } ${isHighlighted ? 'ring-2 ring-blue-500 ring-opacity-50' : ''} ${isSelected ? 'ring-2 ring-blue-600' : ''}`}
                  >
                  {message.replyTo && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReplyClick(message.replyTo!._id);
                      }}
                      className={`${isImageMessage ? 'mx-3 mt-2' : ''} mb-2 pl-3 border-l-4 ${isOwn ? 'border-green-600' : 'border-green-500'} py-1 cursor-pointer hover:opacity-80 transition`}
                    >
                      <p className={`text-xs font-semibold ${isOwn ? 'text-green-700' : 'text-green-400'}`}>
                        {message.replyTo.sender === currentUser?.id 
                          ? 'You' 
                          : isGroupChat && groupInfo
                            ? groupInfo.participants.find(p => p._id === message.replyTo!.sender)?.displayName || 
                              groupInfo.participants.find(p => p._id === message.replyTo!.sender)?.name || 
                              'Unknown'
                            : chatUser?.displayName || chatUser?.name}
                      </p>
                      <p className={`text-xs ${isOwn ? 'opacity-60' : 'opacity-70'} truncate`}>
                        {message.replyTo.content}
                      </p>
                    </div>
                  )}
                  
                  {isImageMessage ? (
                    <div className="space-y-1">
                      <Image
                        src={message.fileUrl || ''}
                        alt="Shared image"
                        width={300}
                        height={300}
                        className="rounded-xl max-w-full h-auto object-cover cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(message.fileUrl || '');
                        }}
                      />
                      {message.content && message.content !== 'Image' && (
                        <div className={`px-3 pb-2 ${isOwn ? 'text-black' : 'text-white'}`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      )}
                      <div className={`px-3 pb-2 flex justify-end`}>
                        <span className={`text-xs whitespace-nowrap ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-2">
                      <p className="flex-1 min-w-0">{message.content}</p>
                      <span className={`text-xs whitespace-nowrap ml-auto ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  
                  {/* Reply icon that appears during swipe */}
                  {swipedMessageId === message._id && Math.abs(swipeOffset) > 20 && selectedMessages.size === 0 && (
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-10' : '-right-10'}`}
                      style={{ opacity: Math.min(Math.abs(swipeOffset) / 60, 1) }}
                    >
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </div>
                  )}
                </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="bg-black/40 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span className="text-xs text-gray-400">
                  Replying to {replyingTo.sender === currentUser?.id ? 'yourself' : chatUser?.displayName || chatUser?.name}
                </span>
              </div>
              <p className="text-sm text-white truncate">{replyingTo.content}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className={`backdrop-blur-md border-t p-4 ${
            theme === 'light' 
              ? 'bg-white/90 border-gray-300' 
              : 'bg-black/40 border-white/10'
          }`}>
            <div className="relative inline-block">
              <Image
                src={imagePreview}
                alt="Preview"
                width={150}
                height={150}
                className="rounded-lg object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`backdrop-blur-md border-t p-4 ${
          theme === 'light' 
            ? 'bg-white/10 border-gray-100' 
            : 'bg-black/40 border-white/10'
        }`}>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 shrink-0 bg-black/50 rounded-full flex items-center justify-center hover:bg-white/20 transition"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={uploadingImage}
              className="flex-1 min-w-0 bg-black/50 backdrop-blur-md text-white rounded-full px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-600 border border-white/10 placeholder-gray-400 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || uploadingImage || (!newMessage.trim() && !selectedImage)}
              className="w-10 h-10 shrink-0 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5 text-white rotate-320" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Cropper */}
      {showCropper && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          onSkip={handleSkipCrop}
          aspect={4 / 3}
        />
      )}

      {/* Chat Options Menu */}
      {showChatMenu && menuPosition && (
        <>
          {/* Backdrop to close menu */}
          <div 
            className="fixed inset-0 z-[999]" 
            onClick={() => {
              setShowChatMenu(false);
              setMenuPosition(null);
            }}
          ></div>
          
          {/* Menu */}
          <div 
            className={`fixed z-[1000] rounded-lg shadow-lg py-2 w-40 bg-gray-900 border border-gray-700`}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
          >
            <button
              onClick={() => {
                setShowChatMenu(false);
                setMenuPosition(null);
                if (chatUser?.username) {
                  router.push(`/${chatUser.username}`);
                }
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm text-white hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium">View Profile</span>
            </button>
            <button
              onClick={() => {
                setShowChatMenu(false);
                setMenuPosition(null);
                // Add report functionality here
                alert('Report functionality to be implemented');
              }}
              className="w-full px-4 py-3 text-left text-red-500 flex items-center gap-3 text-sm hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">Report</span>
            </button>
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black flex flex-col"
          onClick={() => setPreviewImage(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md">
            <button
              onClick={() => setPreviewImage(null)}
              className="text-white hover:text-gray-300 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-white font-semibold">Image</h2>
            <div className="w-6"></div>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4">
            <Image
              src={previewImage}
              alt="Preview"
              width={1200}
              height={1200}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
