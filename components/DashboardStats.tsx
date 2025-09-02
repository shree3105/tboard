'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';
import { DashboardStats as DashboardStatsType } from '@/lib/types';
import { useData } from '@/lib/DataContext';

export default function DashboardStats() {
  const { caseStatistics } = useData();
  const [stats, setStats] = useState<DashboardStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (caseStatistics) {
      setStats({
        total_cases: caseStatistics.total_cases,
        new_referrals: caseStatistics.new_referrals,
        awaiting_surgery_cases: caseStatistics.awaiting_surgery,
        scheduled_cases: caseStatistics.scheduled_cases,
        completed_cases: caseStatistics.completed_cases
      });
      setIsLoading(false);
    }
  }, [caseStatistics]);

  if (isLoading) {
    return (
      <div className="flex space-x-4 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded shadow px-3 py-2 animate-pulse">
            <div className="h-3 bg-gray-200 rounded mb-1"></div>
            <div className="h-5 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="flex space-x-4 mb-4">
      {/* Total Cases */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Total Cases</div>
            <div className="text-sm font-bold text-gray-900">{stats.total_cases}</div>
          </div>
        </div>
      </div>

      {/* New Referrals */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">New Referrals</div>
            <div className="text-sm font-bold text-gray-900">{stats.new_referrals}</div>
          </div>
        </div>
      </div>

      {/* Awaiting Surgery Cases */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Awaiting Surgery</div>
            <div className="text-sm font-bold text-gray-900">{stats.awaiting_surgery_cases}</div>
          </div>
        </div>
      </div>

      {/* Scheduled Cases */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Scheduled Cases</div>
            <div className="text-sm font-bold text-gray-900">{stats.scheduled_cases}</div>
          </div>
        </div>
      </div>

      {/* Completed Cases */}
      <div className="bg-white rounded shadow px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500">Completed Cases</div>
            <div className="text-sm font-bold text-gray-900">{stats.completed_cases}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
