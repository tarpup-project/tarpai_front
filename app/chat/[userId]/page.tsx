'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import publicApi from '@/lib/publicApi';
import api from '@/lib/api';
import { WS_URL } from '@/config/api.config';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import ImageCropper from '@/components/ImageCropper';
import PasswordModal from '@/components/PasswordModal';

interface Message {
  _id: string;
  sender: string;
  content: string;
  type?: string;
  fileUrl?: string;
  createdAt: string;
  isAI?: boolean;
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    siteName?: string;
  };
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
  const [isPublicChat, setIsPublicChat] = useState(false);
  const [publicUserName, setPublicUserName] = useState('');
  const [publicUserEmail, setPublicUserEmail] = useState('');
  const [showPublicForm, setShowPublicForm] = useState(false);
  const [publicUserMessage, setPublicUserMessage] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [canSendMessage, setCanSendMessage] = useState(true);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [lastMessageSentTime, setLastMessageSentTime] = useState<Date | null>(null);
  const [messageTimeoutId, setMessageTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle when user sends a message
  const handleMessageSent = () => {
    const now = new Date();
    setLastMessageSentTime(now);
    
    // Keep input available for 3 minutes, then lock it if no reply
    // The checkCanSendMessage function will handle the actual locking logic
    // when it's called periodically or when new messages arrive
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
      }
    };
  }, [messageTimeoutId]);

  // Track user activity
  useEffect(() => {
    const trackActivity = async () => {
      const token = localStorage.getItem('token');
      if (token && currentUser) {
        try {
          await api.post('/users/activity/update');
        } catch (error) {
          // Silently fail - activity tracking is not critical
          console.log('Activity tracking failed:', error);
        }
      }
    };

    // Track activity immediately
    trackActivity();

    // Track activity every 5 minutes while user is active
    const activityInterval = setInterval(trackActivity, 5 * 60 * 1000);

    // Track activity on user interactions
    const handleUserActivity = () => {
      trackActivity();
    };

    // Add event listeners for user activity
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [currentUser]);

  useEffect(() => {
    // Handle browser back/forward navigation
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      // Only reload if navigating to the chats page
      if (currentPath === '/chats') {
        window.location.reload();
      }
    };

    // Handle page visibility changes (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (document.hidden && socketRef.current) {
        const conversationId = (socketRef.current as any).conversationId;
        console.log('=== PAGE HIDDEN - Emitting leave_conversation ===');
        console.log('Conversation ID:', conversationId);
        if (conversationId) {
          socketRef.current.emit('leave_conversation', { conversationId });
        }
      }
    };

    // Handle beforeunload (page close/refresh)
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        const conversationId = (socketRef.current as any).conversationId;
        console.log('=== PAGE UNLOAD - Emitting leave_conversation ===');
        console.log('Conversation ID:', conversationId);
        if (conversationId) {
          socketRef.current.emit('leave_conversation', { conversationId });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    // Check if user is authenticated immediately
    const token = localStorage.getItem('token');
    
    console.log('=== CHAT PAGE USEEFFECT ===');
    console.log('token:', !!token);
    console.log('currentUser:', !!currentUser);
    console.log('userId:', userId);
    
    // If no token, immediately show public chat
    if (!token) {
      console.log('No token - initializing public chat immediately');
      initializePublicChat();
      return;
    }

    // If we have a token but no currentUser, wait briefly for auth store
    if (token && !currentUser) {
      console.log('Have token but no currentUser - waiting briefly...');
      const timer = setTimeout(() => {
        const updatedUser = useAuthStore.getState().user;
        if (updatedUser) {
          console.log('User loaded - initializing authenticated chat');
          initializeChat();
        } else {
          console.log('Token invalid - clearing and showing public chat');
          localStorage.removeItem('token');
          initializePublicChat();
        }
      }, 100); // Reduced timeout
      return () => clearTimeout(timer);
    }

    // If we have both token and currentUser, initialize authenticated chat
    if (token && currentUser) {
      console.log('Authenticated user - initializing normal chat');
      initializeChat();
    }

    // Cleanup function
    return () => {
      console.log('=== CHAT PAGE CLEANUP ===');
      if (socketRef.current) {
        const conversationId = (socketRef.current as any).conversationId;
        console.log('Emitting leave_conversation for:', conversationId);
        if (conversationId) {
          socketRef.current.emit('leave_conversation', { conversationId });
        }
        socketRef.current.disconnect();
      }
    };
  }, [userId, currentUser]);

  const initializePublicChat = async () => {
    try {
      console.log('=== INITIALIZING PUBLIC CHAT ===');
      console.log('userId param:', userId);
      
      // Only fetch the user we want to chat with (this is public)
      const userResponse = await publicApi.get(`/users/${userId}`);
      console.log('User found:', userResponse.data);
      setChatUser(userResponse.data);
      setIsGroupChat(false);
      setIsPublicChat(true);
      setShowPublicForm(true);
      
      // Don't try to create conversations or fetch messages for unauthenticated users
      // This will be handled after they sign up
    } catch (error: any) {
      console.error('Failed to initialize public chat:', error);
      toast.error('User not found');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePublicChatSubmit = async () => {
    if (!publicUserName.trim() || !publicUserEmail.trim() || !publicUserMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(publicUserEmail)) {
      toast.error('Please enter a valid email');
      return;
    }
    
    setIsCreatingAccount(true);
    
    try {
      // Create pending user and send verification email
      const response = await publicApi.post('/auth/create-pending-user', {
        name: publicUserName,
        email: publicUserEmail,
        recipientId: chatUser?._id,
        messageContent: publicUserMessage,
      });
      
      console.log('Pending user created:', response.data);
      toast.success('Verification email sent! Please check your email.');
      
      // Show email sent confirmation
      setEmailSent(true);
    } catch (error: any) {
      console.error('Failed to create pending user:', error);
      
      // If email already exists, show password modal instead
      if (error.response?.data?.message?.includes('already exists') || 
          error.response?.data?.message?.includes('Email already')) {
        setShowPasswordModal(true);
      } else {
        toast.error(error.response?.data?.message || 'Failed to send verification email');
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };


  const initializeChat = async () => {
    try {
      let conversationId: string;
      let isGroup = false;
      
      console.log('=== INITIALIZING CHAT ===');
      console.log('userId param:', userId);
      
      // First, try to fetch as a user ID (direct message)
      try {
        console.log('Attempting to fetch as user ID...');
        const userResponse = await publicApi.get(`/users/${userId}`);
        console.log('User found:', userResponse.data);
        setChatUser(userResponse.data);
        setIsGroupChat(false);

        // Create or get conversation
        console.log('Creating/getting conversation with user...');
        const conversationResponse = await publicApi.post('/chat/conversations', {
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
          const convResponse = await publicApi.get(`/chat/conversations/${userId}`);
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
        await publicApi.put(`/chat/conversations/${conversationId}/read`);
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
          
          const newMessages = [...filteredMessages, {
            _id: message.id,
            sender: message.sender._id || message.sender,
            content: message.content,
            type: message.type,
            fileUrl: message.fileUrl,
            createdAt: message.createdAt,
            isAI: message.isAI || false,
            linkPreview: message.linkPreview,
            replyTo: message.replyTo ? {
              _id: message.replyTo.id,
              sender: message.replyTo.sender,
              content: message.replyTo.content,
            } : undefined,
          }];
          
          // Check if user can send messages after receiving new message
          setTimeout(() => checkCanSendMessage(newMessages), 100);
          
          return newMessages;
        });
        
        // Automatically mark as read if we're viewing this conversation
        const conversationId = (socketRef.current as any).conversationId;
        if (conversationId && message.sender._id !== currentUser?.id) {
          // Mark the message as read immediately
          publicApi.put(`/chat/conversations/${conversationId}/read`).catch(err => {
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
        console.log('=== FETCHING MESSAGES ===');
        console.log('Conversation ID:', conversationId);
        console.log('Current User ID:', currentUser?.id);
        
        const messagesResponse = await publicApi.get(`/chat/conversations/${conversationId}/messages`);
        console.log('Messages response:', messagesResponse.data);
        console.log('Number of messages:', messagesResponse.data.messages?.length || 0);
        
        setMessages(messagesResponse.data.messages.map((msg: any) => ({
          _id: msg.id,
          sender: msg.sender._id || msg.sender,
          content: msg.content,
          type: msg.type,
          fileUrl: msg.fileUrl,
          createdAt: msg.createdAt,
          isAI: msg.isAI || false,
          linkPreview: msg.linkPreview,
          replyTo: msg.replyTo ? {
            _id: msg.replyTo.id,
            sender: msg.replyTo.sender,
            content: msg.replyTo.content,
          } : undefined,
        })));
        
        // Check if user can send messages based on conversation state
        checkCanSendMessage(messagesResponse.data.messages);
        
        scrollToBottom();
      } catch (error) {
        console.log('=== FAILED TO FETCH MESSAGES ===');
        console.error('Error details:', error);
        console.log('No previous messages or fetch failed');
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

  const checkCanSendMessage = (messages: any[]) => {
    if (!currentUser || messages.length === 0) {
      setCanSendMessage(true);
      setWaitingForReply(false);
      return;
    }

    // Sort messages by creation date to get chronological order
    const sortedMessages = messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Check if current user sent the first message
    const firstMessage = sortedMessages[0];
    const currentUserSentFirst = firstMessage.sender._id === currentUser.id || firstMessage.sender === currentUser.id;
    
    if (!currentUserSentFirst) {
      // Current user didn't send first message, they can always send
      setCanSendMessage(true);
      setWaitingForReply(false);
      return;
    }

    // Current user sent the first message, check if recipient has replied
    const recipientHasReplied = sortedMessages.some(msg => 
      (msg.sender._id !== currentUser.id && msg.sender !== currentUser.id) && !msg.isAI
    );

    if (recipientHasReplied) {
      // Recipient has replied, user can send messages
      setCanSendMessage(true);
      setWaitingForReply(false);
    } else {
      // Recipient hasn't replied yet, check 3-minute rule
      const lastUserMessage = sortedMessages
        .filter(msg => (msg.sender._id === currentUser.id || msg.sender === currentUser.id) && !msg.isAI)
        .pop(); // Get the last message from current user

      if (lastUserMessage) {
        const lastMessageTime = new Date(lastUserMessage.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - lastMessageTime.getTime();
        const threeMinutes = 3 * 60 * 1000; // 3 minutes in milliseconds

        if (timeDiff < threeMinutes) {
          // Less than 3 minutes have passed, user can still send messages
          setCanSendMessage(true);
          setWaitingForReply(false);
          
          // Set a timeout to lock the input after the remaining time
          const remainingTime = threeMinutes - timeDiff;
          if (messageTimeoutId) {
            clearTimeout(messageTimeoutId);
          }
          
          const timeoutId = setTimeout(() => {
            setCanSendMessage(false);
            setWaitingForReply(true);
          }, remainingTime);
          
          setMessageTimeoutId(timeoutId);
        } else {
          // More than 3 minutes have passed, lock the input
          setCanSendMessage(false);
          setWaitingForReply(true);
        }
      } else {
        // No previous messages from user, they can send
        setCanSendMessage(true);
        setWaitingForReply(false);
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Helper function to detect and render links
  const renderMessageContent = (content: string, hasLinkPreview: boolean = false) => {
    // If there's a link preview, don't render the URL as a link in the text
    if (hasLinkPreview) {
      // URL regex pattern
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      // Remove URLs from content when there's a preview
      const contentWithoutUrls = content.replace(urlRegex, '').trim();
      // If content is empty after removing URL, don't render anything
      if (!contentWithoutUrls) {
        return null;
      }
      return contentWithoutUrls;
    }
    
    // No preview - render URLs as clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
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
          await publicApi.post(`/chat/conversations/${conversationId}/messages`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          setSelectedImage(null);
          setImagePreview(null);
          setReplyingTo(null);
          toast.success('Image sent');
          
          // Track that user sent a message for 3-minute rule
          handleMessageSent();
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
        
        // Track that user sent a message for 3-minute rule
        handleMessageSent();
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
    sessionStorage.setItem('cameFromChat', 'true');
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

  // Show public chat form for unauthenticated users
  if (isPublicChat && showPublicForm && chatUser) {
    return (
      <div 
        className={`min-h-screen flex flex-col relative ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}
        style={
          background
            ? {
                background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
              }
            : theme === 'dark'
            ? {
                background: '#000000',
              }
            : theme === 'light'
            ? {
                background: '#e6e6e6',
              }
            : {
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              }
        }
      >
        {/* Overlay for better text readability */}
        {background && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
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
          
          {/* Phone container */}
          <div 
            className={`relative w-full md:max-w-md h-screen md:h-[calc(100vh-2rem)] md:my-4 mx-0 md:mx-4 rounded-none md:rounded-3xl overflow-hidden flex flex-col ${
              theme === 'light' 
                ? 'bg-white/90 shadow-2xl' 
                : theme === 'dark'
                ? 'bg-black/80 shadow-2xl'
                : 'bg-black/30 backdrop-blur-md shadow-2xl'
            }`}
          >
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
              <button
                onClick={() => {
                  sessionStorage.setItem('cameFromChat', 'true');
                  window.location.href = '/chats';
                }}
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

              <div className="flex-1 min-w-0">
                <h2 className={`font-semibold truncate ${theme === 'light' ? 'text-white' : 'text-white'}`}>{chatUser.displayName || chatUser.name}</h2>
              </div>

              <button 
                onClick={() => window.location.href = '/login'}
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium transition"
              >
                Login
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center px-6">
              <div className="text-center mb-8">
                <h1 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  Link up with
                </h1>
                <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {chatUser.displayName || chatUser.name} using <span className="text-pink-500">AI</span>
                </h2>
              </div>
            </div>

            {/* Bottom Form Container */}
            <div className="p-6 pb-8">
              {!emailSent ? (
                <>
                  <div className={`rounded-2xl p-6 space-y-4 mb-4 ${
                    theme === 'light' 
                      ? 'bg-white/90 border border-gray-300' 
                      : 'bg-white/10 backdrop-blur-md border border-white/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <svg className={`w-5 h-5 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <input
                        type="text"
                        value={publicUserName}
                        onChange={(e) => setPublicUserName(e.target.value)}
                        placeholder="Enter your first name:"
                        className={`flex-1 bg-transparent border-none outline-none focus:outline-none text-base ${
                          theme === 'light' ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-gray-400'
                        }`}
                        style={{
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none',
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <svg className={`w-5 h-5 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <input
                        type="email"
                        value={publicUserEmail}
                        onChange={(e) => setPublicUserEmail(e.target.value)}
                        placeholder="Enter your email"
                        className={`flex-1 bg-transparent border-none outline-none focus:outline-none text-base ${
                          theme === 'light' ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-gray-400'
                        }`}
                        style={{
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none',
                        }}
                      />
                    </div>

                  <div className="flex items-center gap-3 pt-4">
                    <textarea
                      value={publicUserMessage}
                      onChange={(e) => setPublicUserMessage(e.target.value)}
                      placeholder="What's on your mind?"
                      rows={1}
                      className={`flex-1 bg-transparent border-none outline-none focus:outline-none text-base resize-none overflow-hidden ${
                        theme === 'light' ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-gray-400'
                      }`}
                      style={{
                        minHeight: '24px',
                        maxHeight: '120px',
                        outline: 'none',
                        border: 'none',
                        boxShadow: 'none',
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                      }}
                    />
                    <button
                      onClick={handlePublicChatSubmit}
                      disabled={isCreatingAccount || !publicUserName.trim() || !publicUserEmail.trim() || !publicUserMessage.trim()}
                      className="w-10 h-10 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed transform rotate-325"
                    >
                      {isCreatingAccount ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <p className={`text-center text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                  By continuing, you agree to create an account and start chatting with {chatUser.displayName || chatUser.name}
                </p>
              </>
            ) : (
              <>
                <div className={`rounded-2xl p-6 text-center mb-4 ${
                  theme === 'light' 
                    ? 'bg-white/90 border border-gray-300' 
                    : 'bg-white/10 backdrop-blur-md border border-white/20'
                }`}>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                    Check Your Email!
                  </h3>
                  
                  <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    We sent a verification link to <strong>{publicUserEmail}</strong>
                  </p>
                  
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Click the link in your email to verify your account and send your message to {chatUser.displayName || chatUser.name}.
                  </p>
                </div>

                <p className={`text-center text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Didn't receive the email? Check your spam folder or try refreshing the page to send again.
                </p>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Password Modal */}
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
          }}
          email={publicUserEmail}
          onSuccess={() => {
            // Refresh the page to update the UI
            window.location.reload();
          }}
          context={{
            action: 'chat',
            recipientId: userId,
            messageContent: publicUserMessage,
            returnUrl: window.location.pathname
          }}
        />
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
        background
          ? {
              background: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }
          : theme === 'dark'
          ? {
              background: '#000000',
            }
          : theme === 'light'
          ? {
              background: '#e6e6e6',
            }
          : {
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            }
      }
    >
      {/* Overlay for better text readability */}
      {background && (
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
        >
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
          {/* Content */}
          <div className="relative z-10 flex flex-col h-screen min-h-0">
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
          {messages.length === 0 && !isPublicChat && chatUser ? (
            /* Empty state for authenticated users */
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center px-6">
                <h1 className={`text-2xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  Link up with
                </h1>
                <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                  {chatUser.displayName || chatUser.name} using <span className="text-pink-500">AI</span>
                </h2>
              </div>
            </div>
          ) : (
            messages.map((message) => {
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
                
                {/* Message container with AI logo positioning */}
                <div className={`flex gap-2 max-w-[70%] ${
                  message.isAI 
                    ? (isOwn ? 'flex-row' : 'flex-row-reverse') // AI messages: left for outgoing, right for incoming
                    : 'flex-row' // Non-AI messages: normal flow
                }`}>
                  {/* TarpAI Logo for ALL AI messages */}
                  {message.isAI && (
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Image
                        src="/logo.png"
                        alt="TarpAI"
                        width={16}
                        height={16}
                        className="w-4 h-4 object-contain"
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-col items-start">{/* Show sender name in group chats for messages from others */}
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
                      <p className={`text-xs ${isOwn ? 'opacity-60' : 'opacity-70'} truncate max-w-[200px] overflow-hidden whitespace-nowrap`}>
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
                        <div className={`px-3 ${isOwn ? 'text-black' : 'text-white'}`}>
                          <p className="text-sm whitespace-pre-wrap mb-1">{message.content}</p>
                          <div className="flex justify-end">
                            <span className={`text-xs whitespace-nowrap ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )}
                      {(!message.content || message.content === 'Image') && (
                        <div className={`px-3 pb-2 flex justify-end`}>
                          <span className={`text-xs whitespace-nowrap ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const renderedContent = renderMessageContent(message.content, !!message.linkPreview);
                        return renderedContent ? (
                          <div>
                            <p className="whitespace-pre-wrap mb-1">{renderedContent}</p>
                            <div className="flex justify-end">
                              <span className={`text-xs whitespace-nowrap ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Link Preview Card */}
                      {message.linkPreview && (
                        <a
                          href={message.linkPreview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`${(() => {
                            const renderedContent = renderMessageContent(message.content, !!message.linkPreview);
                            return renderedContent ? 'mt-2' : '';
                          })()} block rounded-lg overflow-hidden border ${
                            isOwn 
                              ? 'border-gray-200 bg-gray-50' 
                              : theme === 'light'
                                ? 'border-gray-600 bg-gray-700'
                                : 'border-white/20 bg-white/5'
                          } hover:opacity-90 transition`}
                        >
                          {message.linkPreview.image && (
                            <div className="w-full h-40 overflow-hidden bg-gray-200">
                              <Image
                                src={message.linkPreview.image}
                                alt={message.linkPreview.title || 'Link preview'}
                                width={400}
                                height={200}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="p-3">
                            <div className="flex items-start gap-2">
                              <div className="w-4 h-4 mt-0.5 flex-shrink-0">
                                {message.linkPreview.favicon ? (
                                  <Image
                                    src={message.linkPreview.favicon}
                                    alt="favicon"
                                    width={16}
                                    height={16}
                                    className="w-4 h-4"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <svg className={`w-4 h-4 ${isOwn ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {message.linkPreview.siteName && (
                                  <p className={`text-xs mb-1 ${isOwn ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {message.linkPreview.siteName}
                                  </p>
                                )}
                                {message.linkPreview.title && (
                                  <p className={`text-sm font-semibold mb-1 line-clamp-2 ${isOwn ? 'text-gray-900' : 'text-white'}`}>
                                    {message.linkPreview.title}
                                  </p>
                                )}
                                {message.linkPreview.description && (
                                  <p className={`text-xs line-clamp-2 ${isOwn ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {message.linkPreview.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Show timestamp at bottom of preview card if no text content */}
                          {!renderMessageContent(message.content, !!message.linkPreview) && (
                            <div className="px-3 pb-2 flex justify-end">
                              <span className={`text-xs whitespace-nowrap ${isOwn ? 'opacity-60' : 'opacity-70'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </a>
                      )}
                    </>
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
              </div>
            );
          })
          )}
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
              <p className="text-sm text-white truncate max-w-[250px] overflow-hidden whitespace-nowrap">{replyingTo.content}</p>
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

        {/* Input or Waiting Message */}
        {canSendMessage ? (
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
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={uploadingImage}
                rows={1}
                className="flex-1 min-w-0 bg-black/50 backdrop-blur-md text-white rounded-xl px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-600 border border-white/10 placeholder-gray-400 disabled:opacity-50 resize-none overflow-hidden"
                style={{
                  minHeight: '42px',
                  maxHeight: '120px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || uploadingImage || (!newMessage.trim() && !selectedImage)}
                className="w-10 h-10 shrink-0 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed transform rotate-325"
              >
                {uploadingImage ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className={`backdrop-blur-md border-t p-4 ${
            theme === 'light' 
              ? 'bg-white/10 border-gray-100' 
              : 'bg-black/40 border-white/10'
          }`}>
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <div className="mb-2">
                  <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  Continue chatting, once recipient replies
                </p>
                <p className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  You sent the first message. Wait for {chatUser?.displayName || chatUser?.name || 'them'} to respond.
                </p>
              </div>
            </div>
          </div>
        )}
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
    </div>
    </div>
    </div>
  );
}