'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Image from 'next/image';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SecurityIcon from '@mui/icons-material/Security';
import XIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';

const platforms = [
  {
    name: 'Twitter / X',
    icon: <XIcon className="w-6 h-6 text-black" />,
    username: 'tarp.ai/alexj',
  },
  {
    name: 'Facebook',
    icon: <FacebookIcon className="w-6 h-6 text-black" />,
    username: 'tarp.ai/alexj_official',
  },
  {
    name: 'Instagram',
    icon: <InstagramIcon className="w-6 h-6 text-black" />,
    username: 'tarp.ai/alexj_insta',
  },
  {
    name: 'LinkedIn',
    icon: <LinkedInIcon className="w-6 h-6 text-black" />,
    username: 'tarp.ai/alexj_pro',
  },
  {
    name: 'YouTube',
    icon: <YouTubeIcon className="w-6 h-6 text-black" />,
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
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className="w-full px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TarpAI" width={40} height={40} className="w-10 h-10" />
            <span className="text-2xl font-bold text-white">TarpAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-gray-400 hover:text-white transition font-medium">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-400 hover:text-white transition font-medium">
              Pricing
            </Link>
            <Link href="#about" className="text-gray-400 hover:text-white transition font-medium">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition font-medium"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <main className="w-full px-6 lg:px-12 py-12 lg:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-sm font-medium">✨ AI-Driven Moderation</span>
                </div>
                
                <p className="text-xl lg:text-2xl text-gray-400 leading-relaxed max-w-2xl">
                  Use link-in-bio AI to communicate directly with followers. Whether you are online or offline, your AI notifies you when it receives important messages from any follower.
                </p>

                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-sm font-medium">✨ Audience Vault</span>
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  Never lose your
                  <br />
                  audience <span className="text-gray-400">again.</span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-gray-400 leading-relaxed max-w-2xl">
                  The ultimate safety net for creators. Backup your followers across all platforms and carry them with you everywhere you go. Notify all followers in the event you lose any social media account.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 max-w-md">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="tarpai.com/"
                      className="w-full px-4 py-4 rounded-2xl border-2 border-gray-700 bg-gray-900 text-white placeholder-gray-500 font-medium focus:outline-none focus:border-gray-500 transition"
                    />
                  </div>
                  <Link
                    href="/signup"
                    className="bg-white text-black px-8 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition text-center whitespace-nowrap"
                  >
                    Get started for free
                  </Link>
                </div>
                <p className="text-sm text-gray-500">
                  It's free, and takes less than a minute
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 pt-8">
                <div className="text-sm text-gray-500">
                  <div className="font-semibold text-white">70M+</div>
                  <div>creators</div>
                </div>
                <div className="text-sm text-gray-500">
                  <div className="font-semibold text-white">99.9%</div>
                  <div>uptime</div>
                </div>
                <div className="text-sm text-gray-500">
                  <div className="font-semibold text-white">24/7</div>
                  <div>AI support</div>
                </div>
              </div>
            </div>
            {/* Right Column - Visual */}
            <div className="relative">
              <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-gray-800">
                {/* Phone Mockup */}
                <div className="bg-gray-900 rounded-3xl p-2 mx-auto max-w-sm border border-gray-700">
                  <div className="bg-black rounded-2xl overflow-hidden">
                    {/* Phone Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center">
                      <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Image src="/logo.png" alt="Profile" width={40} height={40} className="w-10 h-10" />
                      </div>
                      <h3 className="text-white font-bold text-lg">@alexj</h3>
                      <p className="text-white/80 text-sm">Creator & Entrepreneur</p>
                    </div>
                    
                    {/* Links */}
                    <div className="p-6 space-y-4">
                      {platforms.slice(0, 4).map((platform, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition cursor-pointer"
                        >
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                            {platform.icon}
                          </div>
                          <span className="font-medium text-white">{platform.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-white">AI Online</span>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-gray-700">
                  <div className="text-sm">
                    <div className="font-semibold text-white">1.2M</div>
                    <div className="text-gray-400">followers protected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Features Section */}
      <section id="features" className="w-full px-6 lg:px-12 py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Everything you need</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Powerful features to help you grow, engage, and protect your audience across all platforms.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI-Powered Speed */}
            <div className="bg-white/5 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 hover:bg-white/10 transition">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">AI-Powered Speed</h3>
              <p className="text-gray-400 leading-relaxed">
                Instantly schedule appointments and manage availability with our smart AI assistant. It's like having a 24/7 manager.
              </p>
            </div>

            {/* Total Protection */}
            <div className="bg-white/5 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 hover:bg-white/10 transition">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6">
                <SecurityIcon className="text-black" sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Total Protection</h3>
              <p className="text-gray-400 leading-relaxed">
                Don't let platform bans destroy your career. Own your data with comprehensive backup tools.
              </p>
            </div>

            {/* Digital Footprint */}
            <div className="bg-white/5 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 hover:bg-white/10 transition md:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6">
                <FingerprintIcon className="text-black" sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Digital Footprint</h3>
              <p className="text-gray-400 leading-relaxed">
                Aggregate your digital footprint. Bring all your content and audience into one unified space.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Platforms Section */}
      <section className="w-full px-6 lg:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Everywhere you are</h2>
            <p className="text-xl text-gray-400">One link to rule them all.</p>
          </div>
          
          {/* Platform Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {platforms.map((platform, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:bg-white/10 transition group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    {platform.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-white">{platform.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{platform.username}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Testimonials Section */}
      <section className="w-full px-6 lg:px-12 py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-white">Trusted by creators</h2>
            <p className="text-xl text-gray-400">See what our community has to say</p>
          </div>

          {loadingFeedback ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-white"></div>
            </div>
          ) : feedback.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {feedback.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 backdrop-blur-sm border border-gray-800 rounded-3xl p-8 hover:bg-white/10 transition"
                >
                  <div className="flex items-center gap-4 mb-6">
                    {item.user?.avatar && (
                      <Image
                        src={item.user.avatar}
                        alt={item.user?.name || 'User'}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      {item.user?.name && (
                        <h4 className="font-semibold text-white">{item.user.name}</h4>
                      )}
                      {item.user?.bio && (
                        <p className="text-sm text-gray-500">{item.user.bio}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    "{item.message}"
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No testimonials available yet</p>
            </div>
          )}
        </div>
      </section>
      {/* CTA Section */}
      <section className="w-full px-6 lg:px-12 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-6xl font-bold mb-6 text-white">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Join millions of creators who trust TarpAI to grow and protect their audience.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Link
              href="/signup"
              className="bg-white text-black px-8 py-4 rounded-2xl font-semibold hover:bg-gray-200 transition text-center flex-1"
            >
              Get started for free
            </Link>
            <Link
              href="/login"
              className="bg-white/10 backdrop-blur-sm border border-gray-700 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 transition text-center flex-1"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full px-6 lg:px-12 py-12 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="TarpAI" width={32} height={32} className="w-8 h-8" />
              <span className="text-xl font-bold text-white">TarpAI</span>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition">
                Terms
              </Link>
              <Link href="/support" className="text-gray-400 hover:text-white transition">
                Support
              </Link>
            </div>
            
            <p className="text-gray-500 text-sm">
              © 2026 TarpAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      {/* Mobile Bottom CTA - Only show on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 p-4 z-50">
        <div className="flex gap-3">
          <Link
            href="/login"
            className="flex-1 bg-white/10 backdrop-blur-sm border border-gray-700 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-white/20 transition text-center"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="flex-1 bg-white text-black px-6 py-3 rounded-2xl font-semibold hover:bg-gray-200 transition text-center"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  );
}