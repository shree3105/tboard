'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated on the client side
    if (auth.isAuthenticated()) {
      router.push('/');
    }
  }, [router]);

  return <LoginForm />;
}
