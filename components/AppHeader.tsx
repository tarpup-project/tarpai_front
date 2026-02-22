'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useTheme } from '@/hooks/useTheme';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    _id: string;
    name: string;
    username: string;
    avatar: string;
  };
}

export default function AppHeader() {
  const router = useRouter();
  const { theme } = useTheme();
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mounted, setMounted] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Set up socket connection for real-time notification updates
    const token = localStorage.getItem('token');
    if (token) {
      const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
        auth: { token },
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('AppHeader socket connected');
      });

      socket.on('notification', (notification: any) => {
        console.log('New notification received:', notification);
        // Add new notification to the list
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.disconnect();
      };
    }

    // Also refresh notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      const notifs = response.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(response.data.unreadCount || 0);
      setHasMore(response.data.hasMore || false);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const loadMoreNotifications = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const response = await api.get(`/notifications?offset=${notifications.length}`);
      const newNotifs = response.data.notifications || [];
      setNotifications(prev => [...prev, ...newNotifs]);
      setHasMore(response.data.hasMore || false);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotificationsModal(true);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await api.patch(`/notifications/${notification._id}/read`);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Close the modal
      setShowNotificationsModal(false);

      // Navigate based on notification type
      if (notification.type === 'chat_message' && notification.sender?._id) {
        window.location.href = `/chat/${notification.sender._id}`;
      } else if ((notification.type === 'new_follower' || notification.type === 'follow') && notification.sender) {
        const username = notification.sender.username || notification.sender._id;
        router.push(`/${username}`);
      }
    } catch (error) {
      console.error('Failed to handle notification:', error);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    const type = notification.type;
    
    // For messages and follows, show sender avatar if available
    if ((type === 'message' || type === 'chat_message' || type === 'follow' || type === 'new_follower') && notification.sender?.avatar) {
      return (
        <Image
          src={notification.sender.avatar}
          alt={notification.sender.name}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    
    // For other types, show icon badges
    switch (type) {
      case 'message':
      case 'chat_message':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
        );
      case 'broadcast':
        return (
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        );
      case 'follow':
      case 'new_follower':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      case 'feature':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      <div className="flex justify-between items-start p-6">
        <Image src="/logo.png" alt="TarpAI" width={40} height={40} className="w-10 h-10" />
        
        <div className="flex gap-4">
          <button 
            onClick={handleOpenNotifications}
            className={`w-12 h-12 rounded-full ${theme === 'dark' ? 'bg-black/30 hover:bg-black/50' : 'bg-white/30 hover:bg-white/50'} backdrop-blur-md flex items-center justify-center transition relative`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => router.push('/appearance')}
            className={`w-12 h-12 rounded-full ${theme === 'dark' ? 'bg-black/30 hover:bg-black/50' : 'bg-white/30 hover:bg-white/50'} backdrop-blur-md flex items-center justify-center transition`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z" />
            </svg>
          </button>
          <button 
            onClick={() => router.push('/share-profile')}
            className={`w-12 h-12 rounded-full ${theme === 'dark' ? 'bg-black/30 hover:bg-black/50' : 'bg-white/30 hover:bg-white/50'} backdrop-blur-md flex items-center justify-center transition`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notifications Modal */}
      {mounted && showNotificationsModal && createPortal(
        <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm z-[100] flex items-end`} onClick={() => setShowNotificationsModal(false)}>
          <div 
            className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Notifications</h2>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No more notifications</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 rounded-xl cursor-pointer transition ${
                          theme === 'dark'
                            ? notification.isRead ? 'bg-gray-800 hover:bg-gray-700' : 'bg-blue-900/30 hover:bg-blue-900/50'
                            : notification.isRead ? 'bg-gray-50 hover:bg-gray-100' : 'bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        <div className="flex gap-3">
                          {getNotificationIcon(notification)}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{notification.title}</h3>
                              <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-2`}>{notification.message}</p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-4 top-1/2 -translate-y-1/2"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {hasMore && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={loadMoreNotifications}
                        disabled={loadingMore}
                        className={`px-6 py-2 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} rounded-lg transition disabled:opacity-50 text-sm font-medium min-w-[120px] relative`}
                      >
                        <span className="block">
                          {loadingMore ? 'Loading...' : 'Load More'}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
