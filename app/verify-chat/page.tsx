'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import publicApi from '@/lib/publicApi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function VerifyChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      const token = searchParams.get('token');
      const recipientId = searchParams.get('recipientId');

      if (!token || !recipientId) {
        setError('Invalid verification link');
        setIsVerifying(false);
        return;
      }

      try {
        console.log('Verifying token:', token);
        
        // Verify the token
        const response = await publicApi.post('/auth/verify-chat-token', {
          token,
          recipientId,
        });

        console.log('Verification response:', response.data);

        const { token: jwtToken, user, pendingMessages } = response.data;

        // Store token and user data
        localStorage.setItem('token', jwtToken);
        useAuthStore.getState().setAuth(user, jwtToken);

        toast.success('Email verified! Setting up your chat...');

        // Follow the recipient automatically to enable chat
        try {
          await api.post(`/follows/${recipientId}`);
          console.log('Automatically followed user');
        } catch (error) {
          console.error('Failed to follow:', error);
        }

        // Send pending messages
        if (pendingMessages && pendingMessages.length > 0) {
          try {
            // Create conversation first using authenticated API
            const conversationResponse = await api.post('/chat/conversations', {
              participantId: recipientId,
            });

            const conversationId = conversationResponse.data.id;
            console.log('Conversation created:', conversationId);

            // Send each pending message using authenticated API
            for (const pendingMessage of pendingMessages) {
              await api.post(`/chat/conversations/${conversationId}/messages`, {
                content: pendingMessage.content,
                type: 'text',
              });
              console.log('Sent pending message:', pendingMessage.content);
            }

            toast.success('Your message has been sent!');
          } catch (error) {
            console.error('Failed to send pending messages:', error);
            toast.error('Verification successful, but failed to send message. You can send it manually.');
          }
        }

        // Redirect to chat page
        setTimeout(() => {
          router.push(`/chat/${recipientId}`);
        }, 2000);

      } catch (error: any) {
        console.error('Verification failed:', error);
        setError(error.response?.data?.message || 'Verification failed');
        setIsVerifying(false);
      }
    };

    verifyAndRedirect();
  }, [searchParams, router]);

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center p-6 ${
        theme === 'dark' ? 'bg-black text-white' : 'bg-gray-100 text-black'
      }`}
    >
      <div className={`max-w-md w-full rounded-2xl p-8 text-center ${
        theme === 'dark' 
          ? 'bg-gray-900 border border-gray-800' 
          : 'bg-white border border-gray-200'
      }`}>
        {isVerifying ? (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold mb-4">Verifying Your Email</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Please wait while we verify your email and set up your chat...
            </p>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-red-600">Verification Failed</h1>
            <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {error}
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-full font-medium transition"
            >
              Go to Home
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-green-600">Email Verified!</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Redirecting you to your chat...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
      </div>
    }>
      <VerifyChatContent />
    </Suspense>
  );
}