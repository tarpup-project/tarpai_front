'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { API_URL } from '@/config/api.config';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const handleGetCode = async () => {
    if (!name || !email || !password) {
      toast.error('Please fill in all fields first');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSendingCode(true);

    try {
      await api.post('/auth/signup', { name, email, password });
      toast.success('Verification code sent to your email!');
      setCodeSent(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeSent) {
      toast.error('Please get verification code first');
      return;
    }

    if (!verificationCode) {
      toast.error('Please enter verification code');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/verify-email', { 
        email, 
        code: verificationCode 
      });
      const { token, user } = response.data;
      
      setAuth(user, token);
      toast.success('Account created successfully!');
      router.push('/setup-profile');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
            <h1 className="text-4xl font-bold mb-2">Create account</h1>
            <p className="text-gray-400">Join TarpAI to start building your profile</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm text-gray-400 mb-2">
                FULL NAME
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-700"
                placeholder="Enter your full name"
                required
                disabled={codeSent}
              />
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
                disabled={codeSent}
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
                placeholder="Create a password"
                required
                minLength={6}
                disabled={codeSent}
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm text-gray-400 mb-2">
                VERIFICATION CODE
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-700"
                  placeholder="Enter code"
                  maxLength={6}
                  disabled={!codeSent}
                />
                <button
                  type="button"
                  onClick={handleGetCode}
                  disabled={sendingCode || codeSent}
                  className="bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {sendingCode ? 'Sending...' : codeSent ? 'Code Sent' : 'Get Code'}
                </button>
              </div>
              {codeSent && (
                <p className="text-sm text-green-500 mt-2">
                  ✓ Verification code sent to your email
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !codeSent}
              className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black text-gray-500">Or sign up with</span>
              </div>
            </div>

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
              Google
            </button>
          </form>

          <p className="mt-8 mb-10 text-center text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}