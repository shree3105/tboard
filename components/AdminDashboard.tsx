'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';
import { Users, Activity, Database, Wifi } from 'lucide-react';

interface SystemStats {
  total_cases: {
    total_cases: number;
    new_referrals: number;
    awaiting_surgery: number;
    scheduled_cases: number;
    completed_cases: number;
    archived_cases: number;
  };
  subspecialty_stats: Record<string, number>;
  consultant_workload: Array<{
    consultant_name: string;
    first_name: string;
    last_name: string;
    total_cases: number;
    case_count: number;
  }>;
  websocket_connections: number;
  active_users: number;
}

interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admins: number;
  consultants: number;
  nurses: number;
  viewers: number;
  anaesthetists: number;
}

export default function AdminDashboard() {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [systemData, userData] = await Promise.all([
        apiClient.admin.getSystemStats(),
        apiClient.admin.getUserStatistics()
      ]);
      setSystemStats(systemData);
      setUserStats(userData);
    } catch (error) {
      console.error('Error loading admin stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeToday = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await apiClient.admin.initializeSessions(today);
      toast.success('Today\'s sessions initialized successfully');
    } catch (error) {
      console.error('Error initializing sessions:', error);
      toast.error('Failed to initialize sessions');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    color: string; 
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={initializeToday}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Initialize Today's Sessions
          </button>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh Statistics
          </button>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Cases"
          value={systemStats?.total_cases.total_cases || 0}
          icon={Database}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Users"
          value={systemStats?.active_users || 0}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          title="WebSocket Connections"
          value={systemStats?.websocket_connections || 0}
          icon={Wifi}
          color="bg-purple-500"
        />
        <StatCard
          title="Scheduled Cases"
          value={systemStats?.total_cases.scheduled_cases || 0}
          icon={Activity}
          color="bg-orange-500"
        />
      </div>

      {/* Case Status Breakdown */}
      {systemStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Case Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-semibold text-blue-600">
                {systemStats.total_cases.new_referrals}
              </p>
              <p className="text-sm text-gray-600">New Referrals</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-semibold text-yellow-600">
                {systemStats.total_cases.awaiting_surgery}
              </p>
              <p className="text-sm text-gray-600">Awaiting Surgery</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-semibold text-purple-600">
                {systemStats.total_cases.scheduled_cases}
              </p>
              <p className="text-sm text-gray-600">Scheduled</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-semibold text-green-600">
                {systemStats.total_cases.completed_cases}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-gray-600">
                {systemStats.total_cases.archived_cases}
              </p>
              <p className="text-sm text-gray-600">Archived</p>
            </div>
          </div>
        </div>
      )}

      {/* User Statistics */}
      {userStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-semibold text-indigo-600">{userStats.admins}</p>
              <p className="text-sm text-gray-600">Admins</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-semibold text-blue-600">{userStats.consultants}</p>
              <p className="text-sm text-gray-600">Consultants</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-semibold text-green-600">{userStats.nurses}</p>
              <p className="text-sm text-gray-600">Nurses</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-semibold text-purple-600">{userStats.anaesthetists}</p>
              <p className="text-sm text-gray-600">Anaesthetists</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-gray-600">{userStats.viewers}</p>
              <p className="text-sm text-gray-600">Viewers</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Consultants */}
      {systemStats?.consultant_workload && systemStats.consultant_workload.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Consultant Workload</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consultant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {systemStats.consultant_workload.slice(0, 10).map((consultant, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {consultant.consultant_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {consultant.total_cases}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {consultant.case_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {consultant.case_count || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
