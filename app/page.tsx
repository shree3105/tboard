'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import TraumaBoard from '@/components/TraumaBoard';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('HomePage: Checking authentication...');
    // Add a small delay to ensure token is properly stored after login
    const checkAuth = () => {
      if (!auth.isAuthenticated()) {
        console.log('HomePage: Not authenticated, redirecting to login');
        router.push('/login');
      } else {
        console.log('HomePage: Authenticated, showing TraumaBoard');
        setIsLoading(false);
      }
    };
    
    // Check immediately
    checkAuth();
    
    // Also check after a short delay to handle login redirects
    const timeoutId = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <TraumaBoard />;
}
