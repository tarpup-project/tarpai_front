'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="TarpAI" width={40} height={40} className="w-10 h-10" />
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="text-gray-300 hover:text-white transition px-4 py-2"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="mb-8">
            <span className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-full">
              ✨ AI-Driven Moderation
            </span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            Never lose<br />
            your<br />
            audience<br />
            <span className="text-gray-500">again.</span>
          </h1>
          
          <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto">
            The ultimate safety net for creators. Automatic follower backups, emergency content, and AI-powered engagement tools.
          </p>
          
          <Link
            href="/signup"
            className="inline-block bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition"
          >
            Start Free →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>© 2026 TarpAI. All rights reserved.</p>
      </footer>
    </div>
  );
}