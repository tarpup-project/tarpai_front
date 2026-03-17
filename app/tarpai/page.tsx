'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function TarpAIPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { background } = useBackground();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showCalendarPermissionModal, setShowCalendarPermissionModal] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      // No token, redirect to login
      router.push('/login');
    } else {
      // Token exists, wait for store to hydrate
      setIsCheckingAuth(false);
      loadConversationHistory();
    }
  }, [router]);

  const handleGrantCalendarPermission = () => {
    // Build Google OAuth URL for calendar access using separate calendar client
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/calendar/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar';
    
    // Add state parameter to track the user
    const state = encodeURIComponent(JSON.stringify({ 
      userId: (user as any)?._id,
      returnTo: '/tarpai'
    }));
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;
    
    // Redirect to Google OAuth
    window.location.href = googleAuthUrl;
  };

  const handleDismissCalendarPermission = () => {
    setShowCalendarPermissionModal(false);
    // Don't set permission as granted, so it will show again next time
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      const response = await api.get('/ai/history');
      setMessages(response.data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // If no history, show welcome message
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Reset textarea height
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }, 0);

    try {
      const response = await api.post('/ai/chat', {
        message: userMessage.content,
      });

      const aiMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Check if AI wants to show calendar modal
      if (response.data.action === 'show_calendar_modal') {
        setShowCalendarPermissionModal(true);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
      
      // Remove the user message if API call failed
      setMessages((prev) => prev.slice(0, -1));
      setInputMessage(userMessage.content); // Restore the message
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = async () => {
    if (!confirm('Are you sure you want to clear this conversation?')) return;

    try {
      await api.delete('/ai/conversation');
      setMessages([]);
      toast.success('Conversation cleared');
      // Reload to get new welcome message
      loadConversationHistory();
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast.error('Failed to clear conversation');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        theme === 'dark' ? 'text-white' : 'text-black'
      }`}
      style={
        theme === 'dark'
          ? { background: '#000000' }
          : theme === 'light'
          ? { background: '#e6e6e6' }
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
      {/* Overlay for better text readability */}
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
        <AppHeader />

        {/* Header with Clear Button */}
        <div className="px-4 py-3 flex justify-between items-center border-b border-white/10">
          <div>
            <h1 className={`text-lg font-semibold ${theme === 'light' ? 'text-black' : 'text-white'}`}>
              TarpAI Assistant
            </h1>
            <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Your AI-powered helper
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearConversation}
              className={`text-xs px-3 py-1.5 rounded-full ${
                theme === 'light'
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Clear Chat
            </button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-22 space-y-4">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className={`text-6xl mb-4 ${theme === 'light' ? 'opacity-50' : 'opacity-30'}`}>
                🤖
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                Welcome to TarpAI!
              </h2>
              <p className={`text-sm mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                I can help you manage appointments, schedule meetings, and answer your questions.
              </p>
              
              {/* Action Buttons */}
              <div className="flex gap-3 w-full max-w-md">
                <button
                  onClick={() => {
                    setInputMessage('Create a task schedule for me');
                    // Optionally auto-send the message
                    // handleSendMessage();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition ${
                    theme === 'light'
                      ? 'bg-white text-gray-600 shadow-md hover:shadow-lg'
                      : 'bg-white/10 backdrop-blur-md text-gray-400 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="text-sm">Task Schedule</span>
                </button>
                
                <button
                  onClick={() => {
                    const hasCalendarPermission = localStorage.getItem('calendarPermissionGranted');
                    if (hasCalendarPermission) {
                      setInputMessage('Set an appointment for me');
                      // Optionally auto-send the message
                      // handleSendMessage();
                    } else {
                      setShowCalendarPermissionModal(true);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-medium transition ${
                    theme === 'light'
                      ? 'bg-white text-gray-600 shadow-md hover:shadow-lg'
                      : 'bg-white/10 backdrop-blur-md text-gray-400 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">{localStorage.getItem('calendarPermissionGranted') ? 'Set Appointment' : 'Add Calendar'}</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? theme === 'light'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white text-black'
                      : theme === 'light'
                      ? 'bg-gray-800 text-white shadow-md'
                      : theme === 'dark'
                      ? 'bg-gray-800 text-white'
                      : 'bg-black/60 backdrop-blur-md text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-gray-500'
                        : theme === 'light'
                        ? 'text-gray-300'
                        : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  theme === 'light'
                    ? 'bg-gray-800 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-800 text-white'
                    : 'bg-black/60 backdrop-blur-md text-white'
                }`}
              >
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 pb-4">
          <div
            className={`flex items-end gap-2 rounded-3xl px-4 py-3 ${
              theme === 'light'
                ? 'bg-white shadow-lg'
                : theme === 'dark'
                ? 'bg-gray-800'
                : 'bg-black/60 backdrop-blur-md'
            }`}
          >
            {/* Tool Icon with Dropdown - Only show when there are messages */}
            {messages.length > 0 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  className={`p-2 rounded-full transition ${
                    theme === 'light'
                      ? 'hover:bg-gray-100 text-gray-600'
                      : 'hover:bg-gray-700 text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showToolsDropdown && (
                  <div
                    className={`absolute bottom-full left-0 mb-2 w-48 rounded-2xl shadow-lg overflow-hidden ${
                      theme === 'light' ? 'bg-white' : 'bg-gray-800'
                    }`}
                  >
                    <button
                      onClick={() => {
                        const hasCalendarPermission = localStorage.getItem('calendarPermissionGranted');
                        if (!hasCalendarPermission) {
                          setShowCalendarPermissionModal(true);
                        } else {
                          setInputMessage('Show my calendar events');
                        }
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                        theme === 'light'
                          ? 'hover:bg-gray-100 text-gray-700'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">
                        {localStorage.getItem('calendarPermissionGranted') ? 'Calendar Events' : 'Add Calendar'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        const hasCalendarPermission = localStorage.getItem('calendarPermissionGranted');
                        if (hasCalendarPermission) {
                          setInputMessage('Set an appointment for me');
                        } else {
                          toast.error('Please connect your calendar first');
                          setShowCalendarPermissionModal(true);
                        }
                        setShowToolsDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition ${
                        theme === 'light'
                          ? 'hover:bg-gray-100 text-gray-700'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">Set Appointment</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask TarpAI..."
              disabled={isLoading}
              rows={1}
              className={`flex-1 bg-transparent outline-none text-sm resize-none max-h-32 overflow-y-auto ${
                theme === 'light' ? 'text-black placeholder-gray-400' : 'text-white placeholder-gray-400'
              }`}
              style={{
                minHeight: '24px',
                height: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`p-2 rounded-full transition flex-shrink-0 ${
                inputMessage.trim() && !isLoading
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : theme === 'light'
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              <svg className="w-5 h-5 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>

        </div>

        <BottomNav />
      </div>

      {/* Google Calendar Permission Modal */}
      {showCalendarPermissionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            {/* Calendar Icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-black mb-3">
              Connect Your Calendar
            </h2>

            {/* Description */}
            <p className="text-gray-600 text-center mb-6">
              Allow TarpAI to access your Google Calendar to help you schedule tasks, set appointments, and manage your time more effectively.
            </p>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">Schedule meetings and appointments</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">Set reminders for important tasks</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-700">Get intelligent scheduling suggestions</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGrantCalendarPermission}
                className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connect with Google
              </button>
              <button
                onClick={handleDismissCalendarPermission}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
              >
                Maybe Later
              </button>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Your calendar data is secure and will only be used to help you manage your schedule.
            </p>
          </div>
        </div>
      )}
    </div>
    </div>
    </div>
  );
}
