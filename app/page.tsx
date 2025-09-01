'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import TraumaBoard from '@/components/TraumaBoard';
import auth from '@/lib/auth';
import { User } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get user data
    const currentUser = auth.getUser();
    if (currentUser) {
      setUser(currentUser);
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <>
      <Toaster position="top-right" />
      <TraumaBoard user={user} />
    </>
  );
}
