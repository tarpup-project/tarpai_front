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
  const [showCustomizeMessage, setShowCustomizeMessage] = useState(false);
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

  const handleCustomizeClick = () => {
    setShowCustomizeMessage(true);
    // Auto-hide the message after 5 seconds
    setTimeout(() => {
      setShowCustomizeMessage(false);
    }, 5000);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Allow Enter for new lines when Shift is not pressed
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
        background
          ? {
              background: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }
          : theme === 'dark'
          ? { background: '#000000' }
          : theme === 'light'
          ? { background: '#e6e6e6' }
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
          <div className="relative z-10 flex flex-col pb-20 min-h-0">
        <AppHeader />

        {/* Header with Clear Button */}
        <div className="px-4 py-3 flex justify-between items-center border-b border-white/10">
          <div>
            <h1 className={`text-lg font-semibold ${theme === 'light' ? 'text-black' : 'text-white'}`}>
              TarpAI Assistant
            </h1>
            <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Your Messaging Assistant
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
                Your messaging assistant that helps you communicate with people across platforms.
              </p>
              
              {/* Action Button */}
              <div className="w-full max-w-md">
                <button
                  onClick={handleCustomizeClick}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-medium transition ${
                    theme === 'light'
                      ? 'bg-white text-gray-600 shadow-md hover:shadow-lg'
                      : 'bg-white/10 backdrop-blur-md text-gray-400 border border-white/20 hover:bg-white/20'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Customize</span>
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

          {/* Customize Feature Message */}
          {showCustomizeMessage && (
            <div className="flex justify-start">
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 relative ${
                  theme === 'light'
                    ? 'bg-gray-800 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-800 text-white'
                    : 'bg-black/60 backdrop-blur-md text-white'
                }`}
              >
                {/* Upcoming Feature Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    Coming Soon
                  </span>
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                
                <p className="text-sm">
                  Tell TarpAI how you'd like help with messaging and connecting with others
                </p>
                
                <p className="text-xs mt-2 opacity-70">
                  This feature will allow you to customize TarpAI's messaging assistance based on your communication preferences and needs.
                </p>
                
                <p
                  className="text-xs mt-1 text-gray-400"
                >
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
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
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask TarpAI..."
              disabled={isLoading}
              rows={1}
              className={`flex-1 bg-transparent outline-none focus:outline-none text-sm resize-none max-h-32 overflow-y-auto ${
                theme === 'light' ? 'text-black placeholder-gray-400' : 'text-white placeholder-gray-400'
              }`}
              style={{
                minHeight: '24px',
                height: 'auto',
                outline: 'none',
                border: 'none',
                boxShadow: 'none',
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
    </div>
    </div>
    </div>
  );
}
