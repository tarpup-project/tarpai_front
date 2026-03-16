'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import publicApi from '@/lib/publicApi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onSuccess: () => void;
  context?: {
    profileUserId?: string;
    action?: string;
    profileUsername?: string;
    recipientId?: string;
    messageContent?: string;
    statusId?: string;
    returnUrl?: string;
  };
}

export default function PasswordModal({ 
  isOpen, 
  onClose, 
  email, 
  onSuccess, 
  context 
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handlePasswordLogin = async () => {
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoggingIn(true);

    try {
      // Login with email and password
      const response = await publicApi.post('/auth/login', {
        email: email,
        password: password,
      });

      if (response.data.token) {
        // User logged in successfully
        setAuth(response.data.user, response.data.token);
        
        // Close modal
        onClose();
        
        // Perform the pending action if any
        if (context?.action === 'follow' && context?.profileUserId) {
          try {
            await api.post(`/follows/${context.profileUserId}`);
            toast.success('Logged in and followed successfully!');
          } catch (followError) {
            toast.success('Logged in successfully!');
          }
        } else if (context?.action === 'chat' && context?.recipientId && context?.messageContent) {
          try {
            // First, create or get the conversation with the recipient
            const conversationResponse = await api.post('/chat/conversations', {
              participantId: context.recipientId
            });
            
            const conversationId = conversationResponse.data.id || conversationResponse.data._id;
            
            // Then send the message to that conversation
            await api.post(`/chat/conversations/${conversationId}/messages`, {
              content: context.messageContent,
              type: 'text'
            });
            
            toast.success('Logged in and message sent successfully!');
          } catch (chatError) {
            toast.success('Logged in successfully!');
          }
        } else if (context?.action === 'view_status') {
          // For status viewing, just show success message
          toast.success('Logged in successfully!');
        } else {
          toast.success('Logged in successfully!');
        }
        
        // Call success callback
        onSuccess();
        
        // Reset password
        setPassword('');
      }
    } catch (error: any) {
      console.error('Failed to login:', error);
      if (error.response?.status === 401) {
        toast.error('Invalid password. Please try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to login');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Store the context in localStorage before redirecting to Google OAuth
    const googleContext = {
      ...context,
      returnUrl: context?.returnUrl || window.location.pathname
    };
    localStorage.setItem('googleOAuthContext', JSON.stringify(googleContext));
    
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Redirect to Google OAuth on the backend server
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-6" onClick={handleClose}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">Welcome back!</h2>
            <p className="text-gray-600">Enter your password to continue</p>
            <p className="text-sm text-gray-500 mt-2">{email}</p>
          </div>

          <div>
            <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="loginPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 text-black rounded-lg px-4 py-3 focus:outline-none focus:border-gray-400"
              placeholder="Enter your password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordLogin();
                }
              }}
            />
          </div>

          <button
            onClick={handlePasswordLogin}
            disabled={isLoggingIn}
            className="w-full bg-pink-500 text-white hover:bg-pink-600 py-3 rounded-full font-semibold transition disabled:opacity-50"
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-16 h-16 mx-auto bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:border-gray-400 transition shadow-sm"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>

          <div className="text-center">
            <button
              onClick={handleClose}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}