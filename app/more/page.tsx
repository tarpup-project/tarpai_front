'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useBackground } from '@/hooks/useBackground';
import { useTheme } from '@/hooks/useTheme';
import Image from 'next/image';
import toast from 'react-hot-toast';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import WhatsNewModal from '@/components/WhatsNewModal';
import HelpCenterModal from '@/components/HelpCenterModal';
import SendFeedbackModal from '@/components/SendFeedbackModal';

export default function MorePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme } = useThemeStore();
  const { background } = useBackground();
  const { text } = useTheme();
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [showHelpCenterModal, setShowHelpCenterModal] = useState(false);
  const [showSendFeedbackModal, setShowSendFeedbackModal] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const menuItems = [
    {
      id: 'profile',
      title: user?.displayName || user?.name || 'User Profile',
      subtitle: `@${user?.username || 'username'}`,
      icon: user?.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png',
      isProfile: true,
      onClick: () => router.push('/dashboard')
    },
    {
      id: 'status-history',
      title: 'My Status History',
      icon: '🕐',
      bgColor: 'bg-purple-500',
      hasArrow: true,
      onClick: () => router.push('/status-history')
    },
    {
      id: 'whats-new',
      title: "What's New",
      icon: '✨',
      bgColor: 'bg-blue-500',
      hasArrow: true,
      onClick: () => setShowWhatsNewModal(true)
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      icon: '💬',
      bgColor: 'bg-green-500',
      hasArrow: true,
      onClick: () => setShowSendFeedbackModal(true)
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: '❓',
      bgColor: 'bg-orange-500',
      hasArrow: true,
      onClick: () => setShowHelpCenterModal(true)
    }
  ];

  return (
    <div 
      className={`min-h-screen relative overflow-hidden ${text.primary}`}
      style={
        background
          ? {
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${background})`,
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
              backgroundImage: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            }
      }
    >
      {/* Overlay for better text readability */}
      {background && (
        <div className="hidden md:block absolute inset-0 bg-black/20 backdrop-blur-md"></div>
      )}

      {/* Phone container with blur effect */}
      <div className="relative z-10 flex items-start justify-center min-h-screen w-full">
        {/* Blurred background edges - hidden on mobile */}
        <div 
          className="hidden md:block absolute inset-0 backdrop-blur-xl"
          style={{ 
            maskImage: 'radial-gradient(white 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(white 30%, transparent 70%)'
          }}
        />
        
        {/* Phone container */}
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
          <div className="relative z-10 flex flex-col min-h-0">
        {/* App Header */}
        <AppHeader />
        
        {/* Menu Items */}
        <div className="flex-1 px-2 pb-32 pt-6">
          <div className="max-w-md mx-auto">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full backdrop-blur-md rounded-2xl flex items-center transition hover:opacity-90 ${
                  item.isProfile 
                    ? `p-6 mb-6 ${theme === 'light' ? 'bg-white/90 border border-gray-200' : 'bg-white/10 border border-white/20'}`
                    : `p-3 ${index === menuItems.length - 1 ? 'mb-4' : 'mb-2'} ${theme === 'light' ? 'bg-white/90 border border-gray-200' : 'bg-white/10 border border-white/20'}`
                }`}
              >
                {item.isProfile ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                    <Image
                      src={item.icon}
                      alt={item.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png';
                      }}
                    />
                  </div>
                ) : (
                  <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                )}
                
                <div className="flex-1 ml-4 text-left">
                  <div className={`font-semibold ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
                
                {item.hasArrow && (
                  <svg className={`w-5 h-5 ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`w-full backdrop-blur-md rounded-2xl p-4 flex items-center justify-center transition hover:opacity-90 ${
                theme === 'light' 
                  ? 'bg-red-500/90 border border-red-400' 
                  : 'bg-red-500/20 border border-red-500/30'
              }`}
            >
              <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-white font-semibold">Log Out</span>
            </button>

            {/* Version */}
            <div className="text-center pt-4">
              <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                Version 2.4.0
              </span>
            </div>
          </div>
        </div>
        </div>

        </div>

        {/* Bottom Navigation */}
        <BottomNav />

      {/* What's New Modal */}
      <WhatsNewModal 
        isOpen={showWhatsNewModal} 
        onClose={() => setShowWhatsNewModal(false)} 
      />

      {/* Help Center Modal */}
      <HelpCenterModal 
        isOpen={showHelpCenterModal} 
        onClose={() => setShowHelpCenterModal(false)} 
      />

      {/* Send Feedback Modal */}
      <SendFeedbackModal 
        isOpen={showSendFeedbackModal} 
        onClose={() => setShowSendFeedbackModal(false)} 
      />
    </div>
    </div>
    </div>
  );
}