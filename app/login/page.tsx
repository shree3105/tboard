'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import LoginForm from '@/components/LoginForm';
import auth from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    if (auth.isAuthenticated()) {
      const user = auth.getUser();
      if (user) {
        // Redirect based on user role
        if (user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      }
    }
  }, [router]);

  return (
    <>
      <Toaster position="top-right" />
      <LoginForm />
    </>
  );
}
