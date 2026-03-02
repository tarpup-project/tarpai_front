'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import publicApi from '@/lib/publicApi';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function VerifyProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      const token = searchParams.get('token');
      const profileUserId = searchParams.get('profileUserId');
      const action = searchParams.get('action') as 'follow' | 'followers' | 'following';
      const profileUsername = searchParams.get('profileUsername');

      if (!token || !profileUserId || !action || !profileUsername) {
        setError('Invalid verification link');
        setIsVerifying(false);
        return;
      }

      try {
        console.log('Verifying profile token:', token);
        
        // Verify the token
        const response = await publicApi.post('/auth/verify-profile-token', {
          token,
          profileUserId,
        });

        console.log('Profile verification response:', response.data);

        const { token: jwtToken, user, pendingAction } = response.data;

        // Store token and user data
        localStorage.setItem('token', jwtToken);
        useAuthStore.getState().setAuth(user, jwtToken);

        toast.success('Email verified! Completing your action...');

        // Execute the pending action
        try {
          // Use pendingAction from backend, fallback to URL action parameter
          const actionToExecute = pendingAction?.action || action;
          console.log('Action to execute:', actionToExecute);
          console.log('Pending action from backend:', pendingAction);
          console.log('Action from URL:', action);
          
          if (actionToExecute === 'follow') {
            // Follow the profile user
            await api.post(`/follows/${profileUserId}`);
            console.log('Successfully followed user:', profileUserId);
            toast.success(`Now following @${profileUsername}!`);
          } else if (actionToExecute === 'followers') {
            // No API call needed for viewing followers - user is now authenticated
            toast.success('Email verified! You can now view followers.');
          } else if (actionToExecute === 'following') {
            // No API call needed for viewing following - user is now authenticated
            toast.success('Email verified! You can now view following.');
          }
        } catch (error) {
          console.error('Failed to execute pending action:', error);
          // For follow action, this is critical - show specific error
          const actionToExecute = pendingAction?.action || action;
          if (actionToExecute === 'follow') {
            toast.error('Email verified, but failed to follow user. You can try following again on the profile page.');
          } else {
            toast.error('Email verified! You can now access the profile features.');
          }
        }

        // Redirect back to the profile page with success indicator
        const executedAction = pendingAction?.action || action;
        setTimeout(() => {
          router.push(`/${profileUsername}?verified=true&action=${executedAction}`);
        }, 3000);

      } catch (error: any) {
        console.error('Profile verification failed:', error);
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
              Please wait while we verify your email and complete your action...
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
              Redirecting you back to the profile...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
      </div>
    }>
      <VerifyProfileContent />
    </Suspense>
  );
}