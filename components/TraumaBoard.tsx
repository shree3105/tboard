'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { casesAPI } from '@/lib/api';
import { Case } from '@/lib/types';
import { Plus, LogOut } from 'lucide-react';
import { auth } from '@/lib/auth';
import CasesTable from './CasesTable';
import HorizontalCalendar from './HorizontalCalendar';
import { WebSocketClient } from '@/lib/websocket';

export default function TraumaBoard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedCase, setDraggedCase] = useState<Case | null>(null);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await casesAPI.getCases();
      setCases(data);
    } catch (error: any) {
      toast.error('Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    
    // Initialize WebSocket
    const token = auth.getToken();
    if (token) {
      const ws = new WebSocketClient();
      ws.connect(token);
      
      ws.onMessage((message) => {
        console.log('WebSocket message received:', message);
        // Refresh cases when any change occurs
        fetchCases();
      });
      
      setWsClient(ws);
      
      return () => {
        ws.disconnect();
      };
    }
  }, []);

  const handleLogout = () => {
    if (wsClient) {
      wsClient.disconnect();
    }
    auth.logout();
  };

  const handleCreateCase = async (caseData: Partial<Case>) => {
    try {
      const newCase = await casesAPI.createCase({
        name: caseData.name || '',
        diagnosis: caseData.diagnosis || '',
        outcome: caseData.outcome || 'Pending',
        section: 'new_referral',
        order_index: cases.filter(c => c.section === 'new_referral').length + 1,
        surgery_date: caseData.surgery_date || undefined,
      });
      setCases(prev => [...prev, newCase]);
      toast.success('Case created successfully');
    } catch (error: any) {
      toast.error('Failed to create case');
    }
  };

  const handleUpdateCase = async (caseId: string, updates: Partial<Case>) => {
    try {
      // If caseId is 'new', create a new case
      if (caseId === 'new') {
        await handleCreateCase(updates);
        return;
      }

      const updatedCase = await casesAPI.updateCase(caseId, updates);
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      toast.success('Case updated successfully');
    } catch (error: any) {
      toast.error('Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await casesAPI.deleteCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      toast.success('Case deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete case');
    }
  };

  const handleCompleteCase = async (caseId: string) => {
    try {
      const updatedCase = await casesAPI.updateCase(caseId, {
        section: 'completed',
        outcome: 'Completed',
        surgery_date: null
      });
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      toast.success('Case marked as completed');
    } catch (error: any) {
      toast.error('Failed to complete case');
    }
  };

  const handleDragStart = (caseItem: Case) => {
    setDraggedCase(caseItem);
  };

  const handleDropOnDate = async (date: string) => {
    if (!draggedCase) return;

    try {
      const updates = {
        surgery_date: date,
        section: 'on_list' as const,
      };
      
      await handleUpdateCase(draggedCase.id, updates);
      setDraggedCase(null);
      toast.success('Case scheduled successfully');
    } catch (error: any) {
      toast.error('Failed to schedule case');
    }
  };

  const handleDragEnd = () => {
    setDraggedCase(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary-600">Trauma Board</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cases Table */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Cases by Section</h2>
            </div>
          </div>
          
          <CasesTable
            cases={cases}
            onUpdateCase={handleUpdateCase}
            onDeleteCase={handleDeleteCase}
            onCompleteCase={handleCompleteCase}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>

        {/* Horizontal Calendar */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Surgery Schedule</h2>
          </div>
          <HorizontalCalendar
            cases={cases}
            onDrop={handleDropOnDate}
            onCompleteCase={handleCompleteCase}
            draggedCase={draggedCase}
          />
        </div>
      </div>
    </div>
  );
}
