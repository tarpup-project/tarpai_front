'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        setAuth(user, token);
        
        // Check if there's a stored context from the OAuth flow
        const contextStr = localStorage.getItem('googleOAuthContext');
        if (contextStr) {
          const context = JSON.parse(contextStr);
          localStorage.removeItem('googleOAuthContext'); // Clean up
          
          // If this is from a password modal (has a pending action), skip setup-profile
          // and perform the action directly, even for new users
          if (context.action && (context.action === 'follow' || context.action === 'chat' || context.action === 'view_status')) {
            // Perform the pending action directly
            if (context.action === 'follow' && context.profileUserId) {
              performFollowAction(context.profileUserId, context.returnUrl);
            } else if (context.action === 'chat' && context.recipientId && context.messageContent) {
              performChatAction(context.recipientId, context.messageContent, context.returnUrl);
            } else if (context.action === 'view_status' && context.statusId) {
              // For status viewing, just redirect back to the status page
              toast.success('Successfully signed in with Google!');
              router.push(context.returnUrl);
            } else {
              // Fallback - redirect to return URL or dashboard
              toast.success('Successfully signed in with Google!');
              router.push(context.returnUrl || '/dashboard');
            }
            return; // Exit early, don't check for setup-profile
          }
          
          // If no specific action but has context, check if user needs setup
          const isNewGoogleUser = !localStorage.getItem('hasCompletedSetup_' + user.id);
          if (isNewGoogleUser) {
            toast.success('Welcome! Please complete your profile setup.');
            router.push('/setup-profile');
            return;
          }
          
          // Existing user with context but no action - redirect to return URL
          toast.success('Successfully signed in with Google!');
          router.push(context.returnUrl || '/dashboard');
        } else {
          // No stored context - check if new user needs profile setup
          const isNewGoogleUser = !localStorage.getItem('hasCompletedSetup_' + user.id);
          if (isNewGoogleUser) {
            toast.success('Welcome! Please complete your profile setup.');
            router.push('/setup-profile');
          } else {
            toast.success('Successfully signed in with Google!');
            router.push('/dashboard');
          }
        }
      } catch (error) {
        toast.error('Failed to process Google sign in');
        router.push('/login');
      }
    } else {
      toast.error('Google sign in failed');
      router.push('/login');
    }
  }, [searchParams, setAuth, router]);

  const performFollowAction = async (profileUserId: string, returnUrl: string) => {
    try {
      await api.post(`/follows/${profileUserId}`);
      toast.success('Successfully signed in with Google and followed!');
      router.push(returnUrl);
    } catch (error: any) {
      if (error.response?.data?.message?.includes('already following')) {
        toast.success('Successfully signed in with Google! You are already following this user.');
      } else {
        toast.success('Successfully signed in with Google!');
      }
      router.push(returnUrl);
    }
  };

  const performChatAction = async (recipientId: string, messageContent: string, returnUrl: string) => {
    try {
      // First, create or get the conversation with the recipient
      const conversationResponse = await api.post('/chat/conversations', {
        participantId: recipientId
      });
      
      const conversationId = conversationResponse.data.id || conversationResponse.data._id;
      
      // Then send the message to that conversation
      await api.post(`/chat/conversations/${conversationId}/messages`, {
        content: messageContent,
        type: 'text'
      });
      
      toast.success('Successfully signed in with Google and sent message!');
      router.push(returnUrl);
    } catch (error: any) {
      console.error('Failed to send message after Google OAuth:', error);
      toast.success('Successfully signed in with Google!');
      router.push(returnUrl);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Completing Google sign in...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}