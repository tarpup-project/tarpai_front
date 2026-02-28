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
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col pb-20">
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
              <h2 className={`text-xl font-semibold mb-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                Welcome to TarpAI!
              </h2>
              <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                I can help you manage appointments, schedule meetings, and answer your questions.
              </p>
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
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-3 ${
              theme === 'light'
                ? 'bg-white shadow-lg'
                : theme === 'dark'
                ? 'bg-gray-800'
                : 'bg-black/60 backdrop-blur-md'
            }`}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask TarpAI..."
              disabled={isLoading}
              className={`flex-1 bg-transparent outline-none text-sm ${
                theme === 'light' ? 'text-black placeholder-gray-400' : 'text-white placeholder-gray-400'
              }`}
            />

            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`p-2 rounded-full transition ${
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

        <BottomNav />
      </div>
    </div>
  );
}
