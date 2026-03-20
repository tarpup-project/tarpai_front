'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import api from '@/lib/api';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasUrgentMessages, setHasUrgentMessages] = useState(false);
  const [hasUnviewedStatuses, setHasUnviewedStatuses] = useState(false);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleChatNavigation = () => {
    // Always use window.location.href to force a full page reload
    window.location.href = '/chats';
  };

  // Set correct viewport height for mobile
  useEffect(() => {
    const setVH = () => {
      // Use the smaller of visualViewport.height or window.innerHeight for mobile
      const vh = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
    };

    // Set initial value
    setVH();

    // Update on resize and viewport changes
    window.addEventListener('resize', setVH);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
    }

    return () => {
      window.removeEventListener('resize', setVH);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH);
      }
    };
  }, []);

  // Check for urgent messages
  useEffect(() => {
    const checkUrgentMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await api.get('/chat/conversations');
        const conversations = response.data || [];
        
        // Check if any conversation has urgent messages
        const hasUrgent = conversations.some((conv: any) => conv.hasUrgentMessage === true);
        console.log('🔔 BottomNav urgent check:', hasUrgent);
        setHasUrgentMessages(hasUrgent);
      } catch (error) {
        console.error('Failed to check urgent messages:', error);
      }
    };

    // Check immediately
    checkUrgentMessages();

    // Check every 30 seconds for urgent messages
    const interval = setInterval(checkUrgentMessages, 30000);

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkUrgentMessages();
      }
    };

    // Listen for urgent message updates from chats page
    const handleUrgentMessageUpdate = () => {
      console.log('🔔 BottomNav received urgent message update event');
      checkUrgentMessages();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('urgentMessageUpdate', handleUrgentMessageUpdate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('urgentMessageUpdate', handleUrgentMessageUpdate);
    };
  }, []);

  // Check for unviewed statuses
  useEffect(() => {
    const checkUnviewedStatuses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Get current user ID from token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = payload.id;

        // Get viewed statuses from localStorage
        const viewedStatusIds = localStorage.getItem('viewedStatuses');
        const viewedStatuses = viewedStatusIds ? new Set(JSON.parse(viewedStatusIds)) : new Set();

        // Fetch statuses from feed
        const response = await api.get('/status/feed');
        const statuses = response.data || [];

        // Check if there are any unviewed statuses from other users
        const hasUnviewed = statuses.some((status: any) => 
          status.author._id !== currentUserId && !viewedStatuses.has(status.id)
        );

        setHasUnviewedStatuses(hasUnviewed);
      } catch (error) {
        console.error('Failed to check unviewed statuses:', error);
      }
    };

    // Check immediately
    checkUnviewedStatuses();

    // Check every 60 seconds for new statuses
    const interval = setInterval(checkUnviewedStatuses, 60000);

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkUnviewedStatuses();
      }
    };

    // Listen for status updates from status page
    const handleStatusUpdate = () => {
      checkUnviewedStatuses();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('statusUpdate', handleStatusUpdate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('statusUpdate', handleStatusUpdate);
    };
  }, []);

  return (
    <div 
      className="fixed left-0 right-0 w-full bg-black/60 backdrop-blur-xl border-t border-white/10 z-30 md:left-1/2 md:transform md:-translate-x-1/2 md:max-w-md"
      style={{
        bottom: '0px'
      }}
    >
      <div className="flex justify-around items-center py-4 px-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/dashboard') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="text-xs">Home</span>
        </button>
        
        <button 
          onClick={() => router.push('/tarpai')}
          className={`flex flex-col items-center gap-1 group ${
            isActive('/tarpai') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Image 
            src="/logo.png" 
            alt="TarpAI" 
            width={24} 
            height={24} 
            className={`w-6 h-6 transition ${
              isActive('/tarpai') 
                ? '' 
                : 'brightness-[0.6] grayscale group-hover:brightness-100 group-hover:grayscale-0'
            }`}
          />
          <span className="text-xs">TarpAI</span>
        </button>
        
        <button 
          onClick={handleChatNavigation}
          className={`flex flex-col items-center gap-1 relative ${
            isActive('/chats') || pathname?.startsWith('/chat/') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {/* Urgent message indicator */}
            {hasUrgentMessages && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-black"></div>
            )}
          </div>
          <span className="text-xs">Messages</span>
        </button>
        
        <button 
          onClick={() => router.push('/status')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/status') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            {/* Unviewed status indicator */}
            {hasUnviewedStatuses && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-black"></div>
            )}
          </div>
          <span className="text-xs">Status</span>
        </button>
        
        <button 
          onClick={() => router.push('/more')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/more') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <MoreHorizIcon className="w-6 h-6" />
          <span className="text-xs">More</span>
        </button>
      </div>
    </div>
  );
}