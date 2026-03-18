'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function SetupProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);

  // Generate username if user doesn't have one
  useEffect(() => {
    if (!username && user?.name) {
      // Generate username from name
      const generatedUsername = user.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15) + Math.floor(Math.random() * 1000);
      setUsername(generatedUsername);
    }
  }, [user, username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile info
      const profileData = {
        username,
      };

      await api.patch('/users/profile/info', profileData);

      updateUser({
        username,
      });

      // Mark that user has completed setup
      if (user?.id) {
        localStorage.setItem('hasCompletedSetup_' + user.id, 'true');
      }

      toast.success('Profile setup complete!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl p-8 relative">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold mb-2">Choose your username</h2>
          <p className="text-gray-400 mb-6">Try something similar to your social handles for easy recognition.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm text-gray-400 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={`tarpup.ai/${username}`}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith('tarpup.ai/')) {
                      const usernameOnly = value.substring(10).toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setUsername(usernameOnly);
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 pr-12 py-3 text-white focus:outline-none focus:border-gray-600"
                  placeholder="tarpup.ai/username"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (user?.name) {
                      const newUsername = user.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .substring(0, 15) + Math.floor(Math.random() * 1000);
                      setUsername(newUsername);
                    }
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                  title="Generate new username"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={loading || !username}
              className="w-full bg-white text-black py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}