'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import TraumaBoard from '@/components/TraumaBoard';
import auth from '@/lib/auth';
import { User } from '@/lib/types';

export default function AdminPage() {
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
      // Check if user is admin
      if (currentUser.role !== 'admin') {
        router.push('/');
        return;
      }
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
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <header className="bg-indigo-600 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-indigo-200">
                  Welcome back, {user?.first_name} {user?.last_name} (Admin)
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-transparent rounded-md hover:bg-gray-50"
                >
                  Back to Main
                </button>
                <button
                  onClick={() => auth.logout()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-700 border border-transparent rounded-md hover:bg-indigo-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600 mt-1">Manage users and roles</p>
                <button className="mt-2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Coming Soon
                </button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900">System Settings</h3>
                <p className="text-sm text-gray-600 mt-1">Configure system parameters</p>
                <button className="mt-2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Coming Soon
                </button>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900">Analytics</h3>
                <p className="text-sm text-gray-600 mt-1">View detailed analytics</p>
                <button className="mt-2 px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                  Coming Soon
                </button>
              </div>
            </div>
          </div>

          {/* Trauma Board with Admin Features */}
          <TraumaBoard user={user} isAdmin={true} />
        </main>
      </div>
    </>
  );
}
