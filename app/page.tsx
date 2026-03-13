'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Image from 'next/image';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SecurityIcon from '@mui/icons-material/Security';

const platforms = [
  {
    name: 'Twitter / X',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2s9 5 20 5a9.5 9.5 0 00-9-5.5c4.75 2.25 7-7 7-7" />
      </svg>
    ),
    username: 'tarp.ai/alexj',
  },
  {
    name: 'Facebook',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    username: 'tarp.ai/alexj_official',
  },
  {
    name: 'Instagram',
    icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="4.5" strokeWidth={2} />
        <circle cx="12" cy="12" r="3.5" strokeWidth={2} />
        <circle cx="18" cy="6" r="1" fill="currentColor" />
      </svg>
    ),
    username: 'tarp.ai/alexj_insta',
  },
  {
    name: 'LinkedIn',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
      </svg>
    ),
    username: 'tarp.ai/alexj_pro',
  },
  {
    name: 'YouTube',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    username: 'tarp.ai/alexj_yt',
  },
];

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router, isHydrated]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % platforms.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch feedback from backend
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/support/feedback`);
        if (response.ok) {
          const data = await response.json();
          console.log('Feedback response:', data);
          setFeedback(data || []);
        } else {
          console.error('Failed to fetch feedback:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch feedback:', error);
      } finally {
        setLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="p-6 flex justify-between items-center w-full px-4">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="TarpAI" width={40} height={40} className="w-10 h-10" />
        </div>
        <Link
          href="/login"
          className="text-gray-300 hover:text-white transition"
        >
          Log In
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 w-full overflow-x-hidden">
        <div className="max-w-2xl w-full">
          {/* Badge */}
          <div className="mb-8 flex justify-center">
               <span className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-full">
              ✨ AI-Driven Moderation
            </span>
          </div>
          <p className="text-gray-400 text-lg mb-8 max-w-xl text-center mx-auto">
           Use link-in-bio AI to communicate directly with followers. Whether you are online or offline, your AI notifies you when it recieves important messages from any follower.
          </p>
           <div className="mb-8 flex justify-center">
  <span className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-full">
    ✨ Audience Vault
  </span>
</div>

<h1 className="text-5xl md:text-5xl font-bold mb-6 text-center">
  Never lose your audience <span className="text-gray-500">again.</span>
</h1>
          
          {/* Subheading */}
           <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto text-center">
            The ultimate safety net for creators. Backup your followers across all platforms and carry them with you everywhere you go. Notify all followers in the event you lose any social media account.
          </p>
          
          {/* CTA Button */}
          <Link
            href="/signup"
            className="block bg-white text-black px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-200 transition text-center mb-16"
          >
            Start Free →
          </Link>

          {/* Features Grid */}
          <div className="space-y-4">
            {/* AI-Powered Speed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-lg mb-2">AI-Powered Speed</h3>
                  <p className="text-gray-400 text-sm">Instantly schedule appointments and manage availability with our smart AI assistant. It's like having a 24/7 manager.</p>
                </div>
              </div>
            </div>

            {/* Total Protection */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <SecurityIcon className="text-white" sx={{ fontSize: 24 }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-lg mb-2">Total Protection</h3>
                  <p className="text-gray-400 text-sm">Don't let platform bans destroy your career. Own your data with comprehensive backup tools.</p>
                </div>
              </div>
            </div>

            {/* Digital Footprint */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col items-start gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FingerprintIcon className="text-white" sx={{ fontSize: 24 }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-lg mb-2">Digital Footprint</h3>
                  <p className="text-gray-400 text-sm">Aggregate your digital footprint. Bring all your content and audience into one unified space.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Everywhere You Are Section */}
          <div className="mt-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-2">Everywhere You Are</h2>
              <p className="text-gray-400">One link to rule them all.</p>
            </div>
            
            {/* Carousel Container */}
            <div className="relative w-full">
              {/* Left Arrow */}
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + platforms.length) % platforms.length)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 text-gray-400 hover:text-white transition hidden md:block"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Carousel */}
              <div className="overflow-hidden w-full">
                <div className="flex gap-4 transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(calc(-${currentIndex * 100}% - ${currentIndex * 16}px))`,
                  }}
                >
                  {platforms.map((platform, idx) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 w-full md:w-[calc(33.333%-12px)] bg-gray-900 border border-gray-800 rounded-2xl p-4 min-h-[260px] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          {platform.icon}
                          <h3 className="text-white font-semibold text-lg">{platform.name}</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="h-12 w-12 bg-gray-800 rounded-full"></div>
                          <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-800 rounded-full px-4 py-3">
                        <Image
                          src="/Unknown.png"
                          alt="TarpAI"
                          width={20}
                          height={20}
                          className="w-5 h-5 flex-shrink-0"
                        />
                        <span className="text-white font-medium text-sm truncate">{platform.username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % platforms.length)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 text-gray-400 hover:text-white transition hidden md:block"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Carousel Indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {platforms.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentIndex ? 'bg-white' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trusted by Creators Section */}
      <section className="w-full px-4 py-16 overflow-x-hidden">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white">Trusted by Creators</h2>
          </div>

          {loadingFeedback ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : feedback.length > 0 ? (
            <div className="space-y-4 mb-32">
              {feedback.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex gap-4"
                >
                  {item.user?.avatar && (
                    <div className="flex-shrink-0">
                      <Image
                        src={item.user.avatar}
                        alt={item.user?.name || 'User'}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {item.user?.name && (
                        <h3 className="text-white font-semibold whitespace-nowrap">{item.user.name}</h3>
                      )}
                      {item.user?.bio && (
                        <span className="text-xs text-gray-400 truncate">{item.user.bio}</span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      "{item.message}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No feedback available</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      {/* <footer className="p-6 text-center text-gray-500 text-sm w-full">
        <p>© 2026 TarpAI. All rights reserved.</p>
      </footer> */}

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-black z-40 h-20"></div>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 z-50 max-w-md w-full px-4">
        <Link
          href="/login"
          className="flex-1 bg-gray-900 border border-gray-700 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-gray-800 transition text-center"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="flex-1 bg-white text-black px-6 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition text-center"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
