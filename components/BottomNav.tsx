'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleChatNavigation = () => {
    if (pathname === '/chats' || pathname?.startsWith('/chat/')) {
      // If already on a chat page, reload the window
      window.location.href = '/chats';
    } else {
      // If coming from another page, navigate normally but reload
      router.push('/chats');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 z-30">
      <div className="flex justify-around items-center py-4 px-6 max-w-md mx-auto">
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
        
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <Image src="/logo.png" alt="TarpAI" width={24} height={24} className="w-6 h-6" />
          <span className="text-xs">TarpAI</span>
        </button>
        
        <button 
          onClick={handleChatNavigation}
          className={`flex flex-col items-center gap-1 ${
            isActive('/chats') || pathname?.startsWith('/chat/') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs">Chats</span>
        </button>
        
        <button 
          onClick={() => router.push('/status')}
          className={`flex flex-col items-center gap-1 ${
            isActive('/status') ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-xs">Status</span>
        </button>
        
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-xs">More</span>
        </button>
      </div>
    </div>
  );
}
