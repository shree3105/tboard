'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import auth from '@/lib/auth';
import { User } from '@/lib/types';
import AdminDashboard from '@/components/AdminDashboard';
import UsersManagement from '@/components/UsersManagement';
import SessionConfiguration from '@/components/SessionConfiguration';
import { Users, Settings, BarChart3, Home } from 'lucide-react';

type AdminTab = 'dashboard' | 'users' | 'sessions' | 'analytics';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

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

  const tabs = [
    { id: 'dashboard' as AdminTab, name: 'Dashboard', icon: Home },
    { id: 'users' as AdminTab, name: 'Users', icon: Users },
    { id: 'sessions' as AdminTab, name: 'Session Config', icon: Settings },
    { id: 'analytics' as AdminTab, name: 'Analytics', icon: BarChart3 }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UsersManagement />;
      case 'sessions':
        return <SessionConfiguration />;
      case 'analytics':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Analytics</h2>
            <p className="text-gray-600">Analytics features coming soon...</p>
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  };

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

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Admin Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabContent()}
        </main>
      </div>
    </>
  );
}
