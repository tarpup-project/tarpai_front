'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
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
      // Fetch the other user's details
      const userResponse = await api.get(`/users/${userId}`);
      setChatUser(userResponse.data);

      // Create or get conversation
      const conversationResponse = await api.post('/chat/conversations', {
        participantId: userId,
      });
      const conversationId = conversationResponse.data.id;

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
        console.log('Socket connected');
        // Join the conversation room and get existing viewers
        socket.emit('join_conversation', { conversationId }, (response: any) => {
          console.log('Join conversation response:', response);
          if (response?.existingViewers && response.existingViewers.includes(userId)) {
            setIsOnline(true);
          }
        });
        
        // Check if the other user is viewing after 500ms
        setTimeout(() => {
          socket.emit('check_conversation_viewer', { conversationId, userId });
        }, 500);
        
        // Check again after 2 seconds to catch late joiners
        setTimeout(() => {
          socket.emit('check_conversation_viewer', { conversationId, userId });
        }, 2000);
      });

      socket.on('conversation_viewer_status', (data: { conversationId: string; userId: string; isViewing: boolean }) => {
        console.log('Conversation viewer status:', data);
        if (data.conversationId === conversationId && data.userId === userId) {
          setIsOnline(data.isViewing);
        }
      });

      socket.on('user_joined_conversation', (data: { conversationId: string; userId: string }) => {
        console.log('User joined conversation:', data);
        if (data.conversationId === conversationId && data.userId === userId) {
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
    window.location.href = '/chats';
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
                <h2 className="font-semibold">{selectedMessages.size} selected</h2>
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
                  <p className="text-xs text-gray-400">Online</p>
                ) : (
                  <p className="text-xs text-gray-400">Offline</p>
                )}
              </div>

              <button className="text-gray-300 hover:text-white">
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
                <div
                  onTouchStart={(e) => handleTouchStart(e, message)}
                  onTouchMove={(e) => handleTouchMove(e, message._id, isOwn)}
                  onTouchEnd={() => handleTouchEnd(message)}
                  onClick={() => handleMessageClick(message._id)}
                  style={{
                    transform: swipedMessageId === message._id ? `translateX(${swipeOffset}px)` : 'none',
                    transition: swipedMessageId === message._id && swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
                  }}
                  className={`max-w-[70%] rounded-2xl ${isImageMessage ? 'p-1' : 'px-4 py-2'} relative ${
                    isOwn
                      ? 'bg-white text-black'
                      : 'bg-black/60 backdrop-blur-md text-white border border-white/10'
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
                        {message.replyTo.sender === currentUser?.id ? 'You' : chatUser?.displayName || chatUser?.name}
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
                        className="rounded-xl max-w-full h-auto object-cover"
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
          <div className="bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
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
        <div className="bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
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
              className="w-10 h-10 shrink-0 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition"
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
              className="flex-1 min-w-0 bg-black/40 backdrop-blur-md text-white rounded-full px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 border border-white/10 placeholder-gray-400 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || uploadingImage || (!newMessage.trim() && !selectedImage)}
              className="w-10 h-10 shrink-0 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
          aspect={4 / 3}
        />
      )}
    </div>
  );
}
