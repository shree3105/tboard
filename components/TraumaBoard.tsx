'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { casesAPI } from '@/lib/api';
import { Case } from '@/lib/types';
import { Plus, LogOut } from 'lucide-react';
import { auth } from '@/lib/auth';
import CasesTable from './CasesTable';
import HorizontalCalendar from './HorizontalCalendar';
import ArchivedCases from './ArchivedCases';
import { WebSocketClient } from '@/lib/websocket';
import { format } from 'date-fns';

export default function TraumaBoard() {
  const [cases, setCases] = useState<Case[]>([]);
  const [archivedCases, setArchivedCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [draggedCase, setDraggedCase] = useState<Case | null>(null);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'archived'>('main');

  const fetchCases = async () => {
    try {
      setLoading(true);
      console.log('Fetching main cases (non-archived)...');
      const data = await casesAPI.getCases();
      console.log('Main cases API response:', data);
      console.log('Number of main cases:', data.length);
      setCases(data);
    } catch (error: any) {
      console.error('Error fetching main cases:', error);
      toast.error('Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedCases = async () => {
    try {
      setArchivedLoading(true);
      console.log('Fetching archived cases...');
      const data = await casesAPI.getCases({ archived: true });
      console.log('Archived cases API response:', data);
      console.log('Number of archived cases:', data.length);
      setArchivedCases(data);
    } catch (error: any) {
      console.error('Error fetching archived cases:', error);
      toast.error('Failed to fetch archived cases');
    } finally {
      setArchivedLoading(false);
    }
  };

  const handleWebSocketMessage = async (message: any) => {
    try {
      console.log('Processing WebSocket message:', message);
      
      switch (message.action) {
        case 'create':
          if (message.case) {
            console.log('Case created via WebSocket, case ID:', message.case);
            // For creates, fetch the new case data and add it to state
            try {
              const allCases = await casesAPI.getCases();
              const newCase = allCases.find(c => c.id === message.case);
              if (newCase) {
                setCases(prev => {
                  const exists = prev.some(c => c.id === newCase.id);
                  if (!exists) {
                    console.log('Adding new case to state:', newCase);
                    return [...prev, newCase];
                  }
                  return prev;
                });
              }
            } catch (error) {
              console.error('Failed to fetch new case data:', error);
              fetchCases(); // Fallback to full refresh
            }
          } else {
            console.log('No case ID in create message, refreshing all cases');
            fetchCases();
          }
          break;
        case 'update':
          if (message.case) {
            console.log('Case updated via WebSocket, case ID:', message.case);
            // For updates, fetch the updated case data
            try {
              const allCases = await casesAPI.getCases();
              const updatedCase = allCases.find(c => c.id === message.case);
              if (updatedCase) {
                setCases(prev => {
                  const updated = prev.map(c => c.id === updatedCase.id ? updatedCase : c);
                  console.log('Updated case in state:', updatedCase);
                  return updated;
                });
                // Also update archived cases if the case was archived
                if (updatedCase.archived) {
                  setArchivedCases(prev => {
                    const exists = prev.some(c => c.id === updatedCase.id);
                    if (!exists) {
                      return [...prev, updatedCase];
                    }
                    return prev.map(c => c.id === updatedCase.id ? updatedCase : c);
                  });
                } else {
                  // Remove from archived cases if unarchived
                  setArchivedCases(prev => prev.filter(c => c.id !== updatedCase.id));
                }
              } else {
                // Case might have been archived or deleted, remove from state
                setCases(prev => prev.filter(c => c.id !== message.case));
                setArchivedCases(prev => prev.filter(c => c.id !== message.case));
              }
            } catch (error) {
              console.error('Failed to fetch updated case data:', error);
              fetchCases(); // Fallback to full refresh
            }
          } else {
            console.log('No case ID in update message, refreshing all cases');
            fetchCases();
          }
          break;
        case 'delete':
          if (message.case) {
            console.log('Case deleted via WebSocket, case ID:', message.case);
            setCases(prev => {
              const filtered = prev.filter(c => c.id !== message.case);
              console.log('Removed case from state');
              return filtered;
            });
            setArchivedCases(prev => {
              const filtered = prev.filter(c => c.id !== message.case);
              console.log('Removed case from archived state');
              return filtered;
            });
          } else {
            console.log('No case ID in delete message, refreshing all cases');
            fetchCases();
          }
          break;
        default:
          console.log('Unknown WebSocket action, refreshing all cases:', message.action);
          fetchCases();
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      // Fallback to full refresh on error
      fetchCases();
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
        console.log('Raw WebSocket message received:', message);
        // Handle WebSocket updates more smoothly
        handleWebSocketMessage(message);
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
        surgery_date: caseData.surgery_date || null,
        hospital_number: caseData.hospital_number || '',
        referral_date: caseData.referral_date,
        age: caseData.age || 0,
        gender: caseData.gender || '',
        consultant: caseData.consultant || '',
        history: caseData.history || ''
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

      // Optimistic update - update local state immediately
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...updates } : c));

      // Then update server
      const updatedCase = await casesAPI.updateCase(caseId, updates);
      
      // Update with server response (in case server made additional changes)
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      
      toast.success('Case updated successfully');
    } catch (error: any) {
      // Revert optimistic update on error
      fetchCases();
      toast.error('Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await casesAPI.deleteCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      setArchivedCases(prev => prev.filter(c => c.id !== caseId));
      toast.success('Case deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete case');
    }
  };

  const handleCompleteCase = async (caseId: string) => {
    try {
      // Optimistic update
      setCases(prev => prev.map(c => c.id === caseId ? {
        ...c,
        section: 'completed',
        outcome: 'Completed',
        surgery_date: null
      } : c));

      const updatedCase = await casesAPI.updateCase(caseId, {
        section: 'completed',
        outcome: 'Completed',
        surgery_date: null
      });
      
      // Update with server response
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      toast.success('Case marked as completed');
    } catch (error: any) {
      // Revert on error
      fetchCases();
      toast.error('Failed to complete case');
    }
  };

  const handleDragStart = (caseItem: Case) => {
    setDraggedCase(caseItem);
  };

  const handleDragEnd = () => {
    setDraggedCase(null);
  };

  const handleDropFromTableOnDate = async (date: string) => {
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

  const handleDropOnSection = async (caseId: string, newSection: string) => {
    try {
      const updates: Partial<Case> = {
        section: newSection === 'awaiting_surgery' ? 'on_list' : newSection,
        surgery_date: null // Remove surgery date when moving back to table
      };
      
      await handleUpdateCase(caseId, updates);
      toast.success(`Case moved to ${newSection === 'awaiting_surgery' ? 'Awaiting Surgery' : 'New Referrals'}`);
    } catch (error: any) {
      toast.error('Failed to move case');
    }
  };

  const handleDropOnDate = async (caseId: string, date: string) => {
    try {
      const updates = {
        surgery_date: date,
        section: 'on_list' as const,
      };
      
      await handleUpdateCase(caseId, updates);
      toast.success('Case scheduled successfully');
    } catch (error: any) {
      toast.error('Failed to schedule case');
    }
  };

  const handleReorderCases = async (caseId: string, targetDate: string, newOrderIndex: number) => {
    try {
      // Get all cases for the target date
      const casesOnDate = cases.filter(c => 
        c.section === 'on_list' && 
        c.surgery_date && 
        format(new Date(c.surgery_date), 'yyyy-MM-dd') === targetDate
      ).sort((a, b) => a.order_index - b.order_index);

      // Find the case being moved
      const movingCase = cases.find(c => c.id === caseId);
      if (!movingCase) return;

      // Remove the moving case from the list if it was already on this date
      const otherCases = casesOnDate.filter(c => c.id !== caseId);
      
      // Insert the moving case at the new position
      const reorderedCases = [...otherCases];
      reorderedCases.splice(newOrderIndex - 1, 0, movingCase);

      // Update order indices for all affected cases
      const updates = reorderedCases.map((caseItem, index) => ({
        id: caseItem.id,
        order_index: index + 1
      }));

      // Update all cases in parallel
      await Promise.all(
        updates.map(update => 
          handleUpdateCase(update.id, { 
            order_index: update.order_index,
            surgery_date: targetDate,
            section: 'on_list' as const
          })
        )
      );

      toast.success('Cases reordered successfully');
    } catch (error: any) {
      toast.error('Failed to reorder cases');
    }
  };

  const handleArchiveCase = async (caseId: string) => {
    try {
      // Optimistic update
      const caseToArchive = cases.find(c => c.id === caseId);
      if (caseToArchive) {
        setCases(prev => prev.map(c => c.id === caseId ? { ...c, archived: true } : c));
        setArchivedCases(prev => [...prev, { ...caseToArchive, archived: true }]);
      }

      const updatedCase = await casesAPI.updateCase(caseId, {
        archived: true
      });
      
      // Update with server response
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setArchivedCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      toast.success('Case archived successfully');
    } catch (error: any) {
      // Revert on error
      fetchCases();
      toast.error('Failed to archive case');
    }
  };

  // Add drop zones for table sections
  const handleTableDrop = async (e: React.DragEvent, section: string) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData('text/plain');
    if (caseId && section !== 'completed') {
      await handleDropOnSection(caseId, section);
    }
  };

  const handleTableDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
        <div className="w-full px-2 sm:px-4 lg:px-6">
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
      <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('main')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'main'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Main Board
              </button>
              <button
                onClick={() => {
                  setActiveTab('archived');
                  fetchArchivedCases(); // Always fetch to ensure we get latest data
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'archived'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Archived Cases
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'main' ? (
          <>
            {/* Cases Table */}
            <div className="bg-white shadow rounded-lg mb-4">
              <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Cases by Section</h2>
                </div>
              </div>
              
              <CasesTable
                cases={cases}
                onUpdateCase={handleUpdateCase}
                onDeleteCase={handleDeleteCase}
                onCompleteCase={handleCompleteCase}
                onArchiveCase={handleArchiveCase}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropOnSection={handleDropOnSection}
              />
            </div>

            {/* Horizontal Calendar */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Surgery Schedule</h2>
              </div>
              <HorizontalCalendar
                cases={cases}
                onDrop={handleDropFromTableOnDate}
                onCompleteCase={handleCompleteCase}
                onUpdateCase={handleUpdateCase}
                onDropOnSection={handleDropOnSection}
                onDropOnDate={handleDropOnDate}
                onReorderCases={handleReorderCases}
                draggedCase={draggedCase}
              />
            </div>
          </>
        ) : (
          <ArchivedCases
            cases={archivedCases}
            onDeleteCase={handleDeleteCase}
            loading={archivedLoading}
          />
        )}
      </div>
    </div>
  );
}
