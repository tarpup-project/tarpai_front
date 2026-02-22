'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-email', { email, code });
      const { token, user } = response.data;
      
      setAuth(user, token);
      toast.success('Email verified successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-code', { email });
      toast.success('Verification code resent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/signup" className="flex items-center gap-2">
          <span className="text-xl">←</span>
          <span className="text-gray-400">Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Image src="/logo.png" alt="TarpAI" width={48} height={48} className="w-12 h-12 mb-6" />
            <h1 className="text-4xl font-bold mb-2">Verify your email</h1>
            <p className="text-gray-400">
              We sent a verification code to <span className="text-white">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm text-gray-400 mb-2">
                VERIFICATION CODE
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-gray-700"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResendCode}
              disabled={resending}
              className="text-white hover:underline disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend code'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
