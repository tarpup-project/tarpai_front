'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function CalendarCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        toast.error('Failed to connect calendar');
        setTimeout(() => router.push('/tarpai'), 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        toast.error('No authorization code received');
        setTimeout(() => router.push('/tarpai'), 2000);
        return;
      }

      try {
        // Send the authorization code to backend
        await api.post('/auth/google/calendar', { code });
        
        // Mark calendar as connected
        localStorage.setItem('calendarPermissionGranted', 'true');
        
        setStatus('success');
        toast.success('Calendar connected successfully!');
        setTimeout(() => router.push('/tarpai'), 2000);
      } catch (error: any) {
        console.error('Failed to connect calendar:', error);
        setStatus('error');
        toast.error(error.response?.data?.message || 'Failed to connect calendar');
        setTimeout(() => router.push('/tarpai'), 2000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Connecting your calendar...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white text-lg">Calendar connected successfully!</p>
            <p className="text-gray-400 text-sm mt-2">Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white text-lg">Failed to connect calendar</p>
            <p className="text-gray-400 text-sm mt-2">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCalendarCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    }>
      <CalendarCallbackContent />
    </Suspense>
  );
}
