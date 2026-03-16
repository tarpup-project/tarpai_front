'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { API_URL } from '@/config/api.config';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      setAuth(user, token);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="lg:grid lg:grid-cols-2 min-h-screen">
        {/* Left Column - Form */}
        <div className="flex flex-col">
          {/* Header */}
          <header className="p-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">←</span>
              <span className="text-gray-400">Back</span>
            </Link>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex items-center justify-center px-6">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <Image src="/logo.png" alt="TarpAI" width={48} height={48} className="w-12 h-12 mb-6" />
                <h1 className="text-4xl font-bold mb-2">Welcome back</h1>
                <p className="text-gray-400">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <button
                  type="button"
                  onClick={() => window.location.href = `${API_URL}/auth/google`}
                  className="w-full bg-gray-900 border border-gray-800 text-white py-3 rounded-full font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-black text-gray-500">Or continue with email</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm text-gray-400 mb-2">
                    EMAIL
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-700"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                    PASSWORD
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-700"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p className="mt-8 text-center text-gray-400">
                Don't have an account?{' '}
                <Link href="/signup" className="text-white hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </main>
        </div>

        {/* Right Column - Visual Showcase (Desktop Only) */}
        <div className="hidden lg:flex bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center w-full h-full">
            {/* Phone Mockup */}
            <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-8 mb-8 border border-white/20">
              <div className="bg-white rounded-2xl overflow-hidden max-w-sm mx-auto">
                {/* Phone Header */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-center">
                  <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Image src="/logo.png" alt="Profile" width={32} height={32} className="w-8 h-8" />
                  </div>
                  <h3 className="text-white font-bold">@creator</h3>
                  <p className="text-white/80 text-sm">Content Creator</p>
                </div>
                
                {/* Links */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">📱</span>
                    </div>
                    <span className="font-medium text-gray-900 text-sm">My Latest Content</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">🛍️</span>
                    </div>
                    <span className="font-medium text-gray-900 text-sm">Shop My Products</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">📧</span>
                    </div>
                    <span className="font-medium text-gray-900 text-sm">Contact Me</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-4">Connect with your audience</h2>
              <p className="text-white/80 text-lg max-w-md">
                Share all your content, products, and social links in one place with TarpAI's link-in-bio platform.
              </p>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-20 right-20 bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium text-white">AI Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}