'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { casesAPI } from '@/lib/api';
import { Case, CasesFilters, WebSocketMessage } from '@/lib/types';
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
  const [calendarCases, setCalendarCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [draggedCase, setDraggedCase] = useState<Case | null>(null);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'archived'>('main');

  // Function to handle tab switching
  const handleTabChange = (tab: 'main' | 'archived') => {
    setActiveTab(tab);
    if (tab === 'main') {
      // Reload main table when switching back from archived tab
      fetchCases();
    }
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      console.log('Fetching main cases (non-archived)...');
      // Specific API call: fetch only non-archived cases using negative status query
      const data = await casesAPI.getCases({ status: '!archived' });
      console.log('Main cases API response:', data);
      console.log('Number of main cases:', data.length);
      setCases(data);
    } catch (error: unknown) {
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
      const data = await casesAPI.getCases({ status: 'archived' });
      console.log('Archived cases API response:', data);
      console.log('Number of archived cases:', data.length);
      setArchivedCases(data);
    } catch (error: unknown) {
      console.error('Error fetching archived cases:', error);
      toast.error('Failed to fetch archived cases');
    } finally {
      setArchivedLoading(false);
    }
  };

  const fetchCalendarCases = async (startDate?: Date, endDate?: Date) => {
    try {
      console.log('Fetching calendar cases...', { startDate, endDate });
      
      // Build filters for the selected week
      const filters: Partial<CasesFilters> = {};
      if (startDate && endDate) {
        filters.surgery_date_from = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        filters.surgery_date_to = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      
      // Fetch both non-archived and archived cases with surgery dates for calendar
      const [nonArchivedData, archivedData] = await Promise.all([
        casesAPI.getCases({ ...filters, status: '!archived' }),
        casesAPI.getCases({ ...filters, status: 'archived' })
      ]);
      
      const combinedData = [...nonArchivedData, ...archivedData];
      console.log('Calendar cases API response:', combinedData);
      console.log('Non-archived calendar cases:', nonArchivedData.length);
      console.log('Archived calendar cases:', archivedData.length);
      console.log('Total calendar cases:', combinedData.length);
      
      setCalendarCases(combinedData);
    } catch (error: unknown) {
      console.error('Error fetching calendar cases:', error);
      toast.error('Failed to fetch calendar cases');
    }
  };

  const getCurrentWeekDates = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 6); // Start on Saturday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Friday
    return { startOfWeek, endOfWeek };
  };

  const handleWeekChange = async (startDate: Date, endDate: Date) => {
    console.log('Week changed:', { startDate, endDate });
    await fetchCalendarCases(startDate, endDate);
  };

  const handleWebSocketMessage = async (message: WebSocketMessage) => {
    try {
      console.log('Processing WebSocket message:', message);
      
      switch (message.action) {
        case 'create':
          if (message.case) {
            console.log('Case created via WebSocket, case ID:', message.case);
            // For creates, fetch the new case data and add it to state
            try {
              // Try to fetch the specific case that was created
              const newCaseData = await casesAPI.getCases({ id: message.case });
              if (newCaseData.length > 0) {
                const newCase = newCaseData[0];
                // Add to appropriate state based on status
                if (newCase.status === 'archived') {
                  setArchivedCases(prev => {
                    const exists = prev.some(c => c.id === newCase.id);
                    if (!exists) {
                      return [...prev, newCase];
                    }
                    return prev;
                  });
                } else {
                  setCases(prev => {
                    const exists = prev.some(c => c.id === newCase.id);
                    if (!exists) {
                      console.log('Adding new case to state:', newCase);
                      return [...prev, newCase];
                    }
                    return prev;
                  });
                  // Only add to calendar if it has a surgery date in current week
                  if (newCase.surgery_date) {
                    const { startOfWeek, endOfWeek } = getCurrentWeekDates();
                    const startDateStr = startOfWeek.toISOString().split('T')[0];
                    const endDateStr = endOfWeek.toISOString().split('T')[0];
                    
                    if (newCase.surgery_date >= startDateStr && newCase.surgery_date <= endDateStr) {
                      setCalendarCases(prev => {
                        const exists = prev.some(c => c.id === newCase.id);
                        if (!exists) {
                          console.log('Adding new case to calendar state:', newCase);
                          return [...prev, newCase];
                        }
                        return prev;
                      });
                    }
                  }
                }
              } else {
                // Fallback: refresh all cases if specific case not found
                fetchCases();
              }
            } catch (error: unknown) {
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
                            // Try to fetch the specific case that was updated
              const updatedCaseData = await casesAPI.getCases({ id: message.case });
              if (updatedCaseData.length > 0) {
                const updatedCase = updatedCaseData[0];
                setCases(prev => {
                  const updated = prev.map(c => c.id === updatedCase.id ? updatedCase : c);
                  console.log('Updated case in state:', updatedCase);
                  return updated;
                });
                // Update calendar cases - keep archived cases in calendar
                setCalendarCases(prev => {
                  return prev.map(c => c.id === updatedCase.id ? updatedCase : c);
                });
                // Also update archived cases if the case was archived
                if (updatedCase.status === 'archived') {
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
                setCalendarCases(prev => prev.filter(c => c.id !== message.case));
              }
            } catch (error: unknown) {
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
            setCalendarCases(prev => {
              const filtered = prev.filter(c => c.id !== message.case);
              console.log('Removed case from calendar state');
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
    // Three specific API calls for initial load
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        console.log('Fetching initial data...');
        
        // 1. Fetch non-archived cases for main table
        const mainTableData = await casesAPI.getCases({ status: '!archived' });
        setCases(mainTableData);
        console.log('Main table cases:', mainTableData.length);
        
        // 2. Fetch non-archived cases with surgery dates for current week
        const { startOfWeek, endOfWeek } = getCurrentWeekDates();
        const startDateStr = startOfWeek.toISOString().split('T')[0];
        const endDateStr = endOfWeek.toISOString().split('T')[0];
        
        const nonArchivedCalendarData = await casesAPI.getCases({ 
          status: '!archived',
          surgery_date_from: startDateStr,
          surgery_date_to: endDateStr
        });
        
        // 3. Fetch archived cases with surgery dates for current week
        const archivedCalendarData = await casesAPI.getCases({ 
          status: 'archived',
          surgery_date_from: startDateStr,
          surgery_date_to: endDateStr
        });
        
        const calendarData = [...nonArchivedCalendarData, ...archivedCalendarData];
        setCalendarCases(calendarData);
        console.log('Calendar cases:', calendarData.length);
        
      } catch (error: unknown) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
    
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
        status: 'new_referral',
        subspecialty: 'new_referral', // New cases have 'new_referral' as subspecialty
        order_index: cases.filter(c => c.status === 'new_referral').length + 1,
        surgery_date: caseData.surgery_date || null,
        hospital_number: caseData.hospital_number || null,
        referral_date: caseData.referral_date || null,
        age: caseData.age || null,
        gender: caseData.gender || null,
        consultant: caseData.consultant || null,
        history: caseData.history || null
      });
      setCases(prev => [...prev, newCase]);
      setCalendarCases(prev => [...prev, newCase]);
      toast.success('Case created successfully');
    } catch (error: unknown) {
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

      // Clean up updates - remove null values and undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== null && value !== undefined)
      );

      console.log('Updating case:', caseId, 'with data:', cleanUpdates);

      // Optimistic update - update local state immediately
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, ...cleanUpdates } : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? { ...c, ...cleanUpdates } : c));

      // Then update server
      const updatedCase = await casesAPI.updateCase(caseId, cleanUpdates);
      
      // Update with server response (in case server made additional changes)
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      
      toast.success('Case updated successfully');
    } catch (error: unknown) {
      console.error('Error updating case:', error);
      // Revert optimistic update on error
      fetchCases();
      toast.error('Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await casesAPI.deleteCase(caseId);
      setCases(prev => prev.filter(c => c.id !== caseId));
      setCalendarCases(prev => prev.filter(c => c.id !== caseId));
      setArchivedCases(prev => prev.filter(c => c.id !== caseId));
      toast.success('Case deleted successfully');
    } catch (error: unknown) {
      toast.error('Failed to delete case');
    }
  };

  const handleCompleteCase = async (caseId: string) => {
    try {
      // Find the current case to preserve its outcome
      const currentCase = cases.find(c => c.id === caseId);
      if (!currentCase) return;

      // Optimistic update - only change status, preserve outcome and surgery_date
      setCases(prev => prev.map(c => c.id === caseId ? {
        ...c,
        status: 'completed'
        // Keep existing outcome and surgery_date
      } : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? {
        ...c,
        status: 'completed'
        // Keep existing outcome and surgery_date
      } : c));

      const updatedCase = await casesAPI.updateCase(caseId, {
        status: 'completed'
        // Don't change outcome, surgery_date, or subspecialty
      });
      
      // Update with server response
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      toast.success('Case marked as completed');
    } catch (error: unknown) {
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
      const updates: Partial<Case> = {
        surgery_date: date,
        status: 'on_list' as const,
        // Preserve existing subspecialty - don't change it
      };
      
      await handleUpdateCase(draggedCase.id, updates);
      setDraggedCase(null);
      toast.success('Case scheduled successfully');
    } catch (error: unknown) {
      toast.error('Failed to schedule case');
    }
  };

  const handleDropOnSection = async (caseId: string, newSection: string, newSubspecialty?: string) => {
    try {
      // Get the current case to check if we need to update original_section
      const currentCase = cases.find(c => c.id === caseId);
      if (!currentCase) return;

      const updates: Partial<Case> = {
        status: newSection === 'awaiting_surgery' ? 'on_list' : newSection
      };
      
      // Update subspecialty if provided (when dragging to a different subspecialty area)
      if (newSubspecialty !== undefined) {
        updates.subspecialty = newSubspecialty === 'unassigned' ? null : newSubspecialty;
      }
      
      // Clear surgery_date when moving back to main board (unless it's completed)
      if (currentCase.surgery_date && newSection !== 'completed') {
        updates.surgery_date = null;
      }
      
      await handleUpdateCase(caseId, updates);
      
      const statusMessage = getStatusTitle(newSection);
      const subspecialtyMessage = newSubspecialty ? ` in ${getSubspecialtyTitle(newSubspecialty)}` : '';
      toast.success(`Case moved to ${statusMessage}${subspecialtyMessage}`);
    } catch (error: unknown) {
      toast.error('Failed to move case');
    }
  };

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'new_referral':
        return 'New Referrals';
      case 'awaiting_surgery':
        return 'Awaiting Surgery';
      case 'onward_referrals':
        return 'Onward Referrals';
      case 'completed':
        return 'Completed';
      default:
        return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSubspecialtyTitle = (subspecialty: string | null) => {
    if (!subspecialty) return 'Unassigned';
    switch (subspecialty) {
      case 'hip_and_knee':
        return 'Hip & Knee';
      case 'foot_and_ankle':
        return 'Foot & Ankle';
      case 'shoulder_and_elbow':
        return 'Shoulder & Elbow';
      case 'hand':
        return 'Hand';
      default:
        return subspecialty.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleDropOnDate = async (caseId: string, date: string) => {
    try {
      const updates: Partial<Case> = {
        surgery_date: date,
        status: 'on_list' as const,
      };
      
      await handleUpdateCase(caseId, updates);
      toast.success('Case scheduled successfully');
    } catch (error: unknown) {
      toast.error('Failed to schedule case');
    }
  };

  const handleReorderCases = async (caseId: string, targetDate: string, newOrderIndex: number) => {
    try {
      // Get all cases for the target date
      const casesOnDate = cases.filter(c => 
        c.status === 'on_list' && 
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
            status: 'on_list' as const
          })
        )
      );

      toast.success('Cases reordered successfully');
    } catch (error: unknown) {
      toast.error('Failed to reorder cases');
    }
  };

  const handleArchiveCase = async (caseId: string) => {
    try {
      // Optimistic update
      const caseToArchive = cases.find(c => c.id === caseId);
      if (caseToArchive) {
        setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'archived' } : c));
        setCalendarCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'archived' } : c));
        setArchivedCases(prev => [...prev, { ...caseToArchive, status: 'archived' }]);
      }

      const updatedCase = await casesAPI.updateCase(caseId, {
        status: 'archived'
      });
      
      // Update with server response
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setArchivedCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      toast.success('Case archived successfully');
    } catch (error: unknown) {
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
                onClick={() => handleTabChange('main')}
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
                  handleTabChange('archived');
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
                calendarCases={calendarCases}
                onDrop={handleDropFromTableOnDate}
                onCompleteCase={handleCompleteCase}
                onUpdateCase={handleUpdateCase}
                onDropOnSection={handleDropOnSection}
                onDropOnDate={handleDropOnDate}
                onReorderCases={handleReorderCases}
                draggedCase={draggedCase}
                onWeekChange={handleWeekChange}
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
