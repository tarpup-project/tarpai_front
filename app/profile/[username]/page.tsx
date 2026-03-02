'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    if (username) {
      router.replace(`/${username}`);
    } else {
      router.replace('/dashboard');
    }
  }, [username, router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
  );
}