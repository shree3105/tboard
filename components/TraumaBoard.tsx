'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [currentCalendarWeek, setCurrentCalendarWeek] = useState<{ startDate: Date; endDate: Date }>(() => {
    // Initialize with the current week (Saturday to Friday)
    const today = new Date();
    
    // Calculate the current week (Saturday to Friday)
    const startOfWeek = new Date(today);
    // If today is Saturday (6), stay on Saturday. Otherwise, go back to the most recent Saturday
    const daysSinceSaturday = (today.getDay() + 1) % 7; // Saturday = 0, Sunday = 1, Monday = 2, etc.
    startOfWeek.setDate(today.getDate() - daysSinceSaturday);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Friday
    
    return { startDate: startOfWeek, endDate: endOfWeek };
  });
  
  // Track processed messages to prevent duplicates (disabled - multiple tabs are normal)
  // const [processedMessages, setProcessedMessages] = useState<Set<string>>(new Set());

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
      // console.log('Fetching main cases (non-archived)...');
      
      let data;
      try {
        // Use the new refresh endpoint for better performance
        data = await casesAPI.refreshCases();
        // console.log('Main cases from refresh endpoint:', data);
      } catch (error) {
        console.warn('Refresh endpoint failed, falling back to getCases:', error);
        data = await casesAPI.getCases();
        // console.log('Main cases from getCases:', data);
      }
      
      // Filter for non-archived cases on the frontend
      const nonArchivedCases = data.filter(caseItem => caseItem.status !== 'archived');
      setCases(nonArchivedCases);
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
      // console.log('Fetching archived cases...');
      // Use the refresh endpoint and filter for archived cases
      const allCasesData = await casesAPI.refreshCases();
      const archivedData = allCasesData.filter(caseItem => caseItem.status === 'archived');
      setArchivedCases(archivedData);
    } catch (error: unknown) {
      console.error('Error fetching archived cases:', error);
      toast.error('Failed to fetch archived cases');
    } finally {
      setArchivedLoading(false);
    }
  };

  const fetchCalendarCases = async (startDate?: Date, endDate?: Date) => {
    try {
      // console.log('Fetching calendar cases...', { startDate, endDate });
      
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

  const handleWeekChange = useCallback(async (startDate: Date, endDate: Date) => {
    setCurrentCalendarWeek({ startDate, endDate });
    await fetchCalendarCases(startDate, endDate);
  }, []);

  const handleWebSocketMessage = async (message: WebSocketMessage) => {
    try {
      // console.log('Processing WebSocket message:', message);
      
      // Create a unique message ID for deduplication (disabled - multiple tabs are normal)
      // const messageId = `${message.message_type}_${message.action}_${message.case_id}_${message.timestamp}`;
      
      // Check if we've already processed this message (disabled)
      // if (processedMessages.has(messageId)) {
      //   console.log('Skipping duplicate message:', messageId);
      //   return;
      // }
      
      // Add to processed messages (disabled)
      // setProcessedMessages(prev => {
      //   const newSet = new Set(prev);
      //   newSet.add(messageId);
      //   // Keep only last 100 messages to prevent memory leaks
      //   if (newSet.size > 100) {
      //     const array = Array.from(newSet);
      //     return new Set(array.slice(-50));
      //   }
      //   return newSet;
      // });
      
      // Handle calendar-specific updates FIRST (they're more specific)
      if (message.message_type === 'calendar_update') {
        // console.log('Calendar update received:', message);
        handleWebSocketCalendarUpdate(message);
        return;
      }
      
      // Handle case updates normally
      if (message.message_type === 'case_update' && message.case_data) {
        // console.log('Enhanced WebSocket message received with complete case data');
        
        // Add a small delay to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 50));
        
        switch (message.action) {
          case 'create':
            // Case created via WebSocket
            handleWebSocketCreateEnhanced(message.case_data);
            break;
          case 'update':
            // Case updated via WebSocket
            handleWebSocketUpdateEnhanced(message.case_data);
            break;
          case 'delete':
            // Case deleted via WebSocket
            handleWebSocketDelete(message.case_id);
            break;
          default:
            // Unknown WebSocket action, refreshing all cases
            await fetchCases();
        }
      } else {
        // Fallback for old message format
        // Legacy WebSocket message format, refreshing all cases
        await fetchCases();
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      // Fallback to full refresh on error
      await fetchCases();
    }
  };

  const handleWebSocketCalendarUpdate = async (message: WebSocketMessage) => {
    const currentWeekStart = currentCalendarWeek.startDate.toISOString().split('T')[0];
    const currentWeekEnd = currentCalendarWeek.endDate.toISOString().split('T')[0];
    
    // Check if the case's surgery date falls within our current calendar week
    const caseSurgeryDate = message.case_data?.surgery_date;
    const caseDateInCurrentWeek = caseSurgeryDate && 
      caseSurgeryDate >= currentWeekStart && 
      caseSurgeryDate <= currentWeekEnd;
    
    // Process calendar updates if:
    // 1. It's for our current week, OR
    // 2. The case's surgery date is in our current week, OR
    // 3. It's a remove action (case being moved away from calendar)
    const shouldProcess = (message.week_start === currentWeekStart && message.week_end === currentWeekEnd) || 
                         caseDateInCurrentWeek || 
                         message.action === 'remove';
    

    
    if (shouldProcess) {
      switch (message.action) {
        case 'add':
          if (message.case_data && caseDateInCurrentWeek) {
            setCalendarCases(prev => {
              const exists = prev.some(c => c.id === message.case_id);
              return exists 
                ? prev.map(c => c.id === message.case_id ? message.case_data : c)
                : [...prev, message.case_data];
            });
          }
          break;
        case 'update':
          if (message.case_data) {
            if (caseDateInCurrentWeek) {
              setCalendarCases(prev => {
                const exists = prev.some(c => c.id === message.case_id);
                return exists 
                  ? prev.map(c => c.id === message.case_id ? message.case_data : c)
                  : [...prev, message.case_data];
              });
            } else {
              setCalendarCases(prev => prev.filter(c => c.id !== message.case_id));
            }
          }
          break;
        case 'remove':
          setCalendarCases(prev => prev.filter(c => c.id !== message.case_id));
          break;
        default:
          await fetchCalendarCases(currentCalendarWeek.startDate, currentCalendarWeek.endDate);
      }
    }
  };



  const handleWebSocketDelete = (caseId: string) => {
    // Removing case from all states
    setCases(prev => prev.filter(c => c.id !== caseId));
    setCalendarCases(prev => prev.filter(c => c.id !== caseId));
    setArchivedCases(prev => prev.filter(c => c.id !== caseId));
  };

  // Enhanced WebSocket handlers that use complete case data
  const handleWebSocketCreateEnhanced = (newCase: Case) => {
    // Adding new case to state
    
    // Add to appropriate state based on status
    if (newCase.status === 'archived') {
      setArchivedCases(prev => {
        const exists = prev.some(c => c.id === newCase.id);
        return exists ? prev : [...prev, newCase];
      });
    } else {
      setCases(prev => {
        const exists = prev.some(c => c.id === newCase.id);
        return exists ? prev : [...prev, newCase];
      });
      
      // Add to calendar if it has a surgery date in current week
      if (newCase.surgery_date) {
        const startDateStr = currentCalendarWeek.startDate.toISOString().split('T')[0];
        const endDateStr = currentCalendarWeek.endDate.toISOString().split('T')[0];
        
        if (newCase.surgery_date >= startDateStr && newCase.surgery_date <= endDateStr) {
          setCalendarCases(prev => {
            const exists = prev.some(c => c.id === newCase.id);
            return exists ? prev : [...prev, newCase];
          });
        }
      }
    }
  };

  const handleWebSocketUpdateEnhanced = (updatedCase: Case) => {
    // Updating case in state
    
    // Update all states atomically using complete case data
    setCases(prev => {
      const exists = prev.some(c => c.id === updatedCase.id);
      if (updatedCase.status === 'archived') {
        // Remove from main cases if archived
        return prev.filter(c => c.id !== updatedCase.id);
      } else {
        // Update or add to main cases
        return exists 
          ? prev.map(c => c.id === updatedCase.id ? updatedCase : c)
          : [...prev, updatedCase];
      }
    });

    setArchivedCases(prev => {
      const exists = prev.some(c => c.id === updatedCase.id);
      if (updatedCase.status === 'archived') {
        // Add or update in archived cases
        return exists 
          ? prev.map(c => c.id === updatedCase.id ? updatedCase : c)
          : [...prev, updatedCase];
      } else {
        // Remove from archived cases if not archived
        return prev.filter(c => c.id !== updatedCase.id);
      }
    });

    setCalendarCases(prev => {
      const exists = prev.some(c => c.id === updatedCase.id);
      if (updatedCase.surgery_date) {
        // Check if surgery date is in the calendar's current week (not today's week)
        const startDateStr = currentCalendarWeek.startDate.toISOString().split('T')[0];
        const endDateStr = currentCalendarWeek.endDate.toISOString().split('T')[0];
        
        if (updatedCase.surgery_date >= startDateStr && updatedCase.surgery_date <= endDateStr) {
          // Add or update in calendar
          return exists 
            ? prev.map(c => c.id === updatedCase.id ? updatedCase : c)
            : [...prev, updatedCase];
        } else {
          // Remove from calendar if surgery date not in current week
          return prev.filter(c => c.id !== updatedCase.id);
        }
      } else {
        // Remove from calendar if no surgery date
        return prev.filter(c => c.id !== updatedCase.id);
      }
    });
  };

  useEffect(() => {
    // Three specific API calls for initial load
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // 1. Fetch all cases using the new refresh endpoint
        let allCasesData;
        try {
          allCasesData = await casesAPI.refreshCases();
        } catch (error) {
          console.warn('Refresh endpoint failed, falling back to regular getCases:', error);
          allCasesData = await casesAPI.getCases();
        }
        
        const mainTableData = allCasesData.filter(caseItem => caseItem.status !== 'archived');
        setCases(mainTableData);
        
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
        
      } catch (error: unknown) {
        console.error('Error fetching initial data:', error);
        toast.error('Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
    
    // Initialize WebSocket with better error handling
    const initializeWebSocket = () => {
      const token = auth.getToken();
      if (token) {
        // Initializing WebSocket
        const ws = new WebSocketClient();
        
        // Add connection status logging
        ws.onMessage((message) => {
          handleWebSocketMessage(message);
        });
        
        // Connect with a small delay to ensure proper initialization
        setTimeout(() => {
          ws.connect(token);
          setWsClient(ws);
        }, 100);
        
        // Set up periodic connection check
        const connectionCheck = setInterval(() => {
          if (!ws.isConnected()) {
            // WebSocket disconnected, attempting to reconnect
            ws.connect(token);
          }
        }, 30000); // Check every 30 seconds
        
        return () => {
          clearInterval(connectionCheck);
          ws.disconnect();
        };
      }
    };
    
    const cleanup = initializeWebSocket();
    
    return cleanup;
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

      // Updating case via API

      // Optimistic update - update local state immediately
      const optimisticCase = { ...cases.find(c => c.id === caseId), ...cleanUpdates } as Case;
      
      setCases(prev => prev.map(c => c.id === caseId ? optimisticCase : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? optimisticCase : c));
      setArchivedCases(prev => prev.map(c => c.id === caseId ? optimisticCase : c));

      // Then update server
      const updatedCase = await casesAPI.updateCase(caseId, cleanUpdates);
      
      // Update with server response (in case server made additional changes)
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setCalendarCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      setArchivedCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      
      toast.success('Case updated successfully');
    } catch (error: unknown) {
      console.error('Error updating case:', error);
      
      // Handle specific error types
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response;
        if (response?.status === 422) {
          toast.error('Invalid data format. Please check status and subspecialty values.');
        } else if (response?.status === 401) {
          toast.error('Authentication failed. Please log in again.');
        } else {
          toast.error(`Update failed: ${response?.data?.detail || 'Unknown error'}`);
        }
      } else {
        toast.error('Failed to update case');
      }
      
      // Revert optimistic update on error by refreshing data
      await fetchCases();
      await fetchArchivedCases();
      await fetchCalendarCases();
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
        status: newSection
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
      // Get all cases for the target date (including archived and completed)
      const casesOnDate = [...cases, ...calendarCases, ...archivedCases].filter(c => 
        c.surgery_date && 
        format(new Date(c.surgery_date), 'yyyy-MM-dd') === targetDate
      ).sort((a, b) => a.order_index - b.order_index);

      // Find the case being moved
      const movingCase = casesOnDate.find(c => c.id === caseId);
      if (!movingCase) {
        return;
      }

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

      // Apply updates to reorder cases

      // Update all cases in parallel
      await Promise.all(
        updates.map(update => {
          const caseToUpdate = casesOnDate.find(c => c.id === update.id);
          return handleUpdateCase(update.id, { 
            order_index: update.order_index,
            surgery_date: targetDate,
            // Preserve the case's current status (don't change archived/completed to on_list)
            status: caseToUpdate?.status || 'on_list'
          });
        })
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
                onDragStart={(caseItem) => setDraggedCase(caseItem)}
                onDragEnd={() => setDraggedCase(null)}
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
