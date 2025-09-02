'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import apiClient from '@/lib/api';
import auth from '@/lib/auth';
import { Case, CaseStatus, CaseSubspecialty, PriorityLevel, User, TheatreSession, TheatreSessionCreate, TheatreSessionUpdate, CaseSchedule, CaseScheduleCreate, CaseScheduleUpdate, ScheduleStatus } from '@/lib/types';
import CasesTable from './CasesTable';
// Remove unused imports
import DashboardStats from './DashboardStats';
import NotificationPanel from './NotificationPanel';
import SingleDayCalendar from './SingleDayCalendar';
import { useData } from '@/lib/DataContext';

interface TraumaBoardProps {
  user?: User;
  isAdmin?: boolean;
}

// Component instance counter to debug duplicate rendering
let traumaBoardInstanceCount = 0;

export default function TraumaBoard({ user, isAdmin = false }: TraumaBoardProps) {
  const router = useRouter();
  
  // Track component instances
  const instanceId = React.useId();
  React.useEffect(() => {
    traumaBoardInstanceCount++;
    console.log(`🏥 TraumaBoard instance ${instanceId} created (total: ${traumaBoardInstanceCount})`);
    
    return () => {
      traumaBoardInstanceCount--;
      console.log(`🏥 TraumaBoard instance ${instanceId} destroyed (total: ${traumaBoardInstanceCount})`);
    };
  }, [instanceId]);
  
  // Use centralized data context
  const {
    cases,
    theatres,
    sessions,
    isLoading: isDataLoading,
    isInitialized,
    addCase,
    updateCase: updateCaseInContext,
    deleteCase: deleteCaseInContext,
    addSession,
    updateSession,
    deleteSession,
    addTheatre,
    updateTheatre,
    deleteTheatre
  } = useData();
  
  // Debug: Log cases array changes
  useEffect(() => {
    console.log(`🏥 TraumaBoard cases updated: ${cases.length} cases`);
    console.log(`🏥 Cases in TraumaBoard:`, cases.map(c => `${c.id} - ${c.name} (${c.status})`));
    const caseIds = cases.map(c => c.id);
    const duplicateIds = caseIds.filter((id, index) => caseIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      console.warn('🚨 Duplicate case IDs found in TraumaBoard:', duplicateIds);
    }
  }, [cases]);
  
  // Local state for schedules (date-specific)
  const [schedules, setSchedules] = useState<CaseSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket connection
  const [wsClient, setWsClient] = useState<any>(null);
  
  // Track last processed date to prevent duplicate API calls during Strict Mode
  const lastProcessedDate = React.useRef<string | null>(null);
  
  // Force re-render when WebSocket updates come in
  const [refreshTrigger, setRefreshTrigger] = useState(0);



  // No need to fetch initial data - DataContext handles it
  // Just initialize schedules as empty
  useEffect(() => {
    setSchedules([]);
  }, []);
  


  // WebSocket handlers - Real-time updates without manual refreshes
  const handleWebSocketCaseUpdate = useCallback((message: any) => {
    const { action, case_id, data } = message;
    
    switch (action) {
      case 'create':
      case 'created':
        // Add new case to list
        if (data && !data.archived) {
          addCase(data);
          setRefreshTrigger(prev => prev + 1);
        }
        break;
        
      case 'update':
      case 'updated':
        // Update existing case
        if (data) {
          // Check if case exists in current array
          const existingCase = cases.find(c => c.id === case_id);
          
          if (existingCase) {
            updateCaseInContext(case_id, data);
          } else {
            addCase(data);
          }
          
          // Force re-render to show the update
          setRefreshTrigger(prev => prev + 1);
        }
        break;
        
      case 'status_changed':
        // Handle status transition
        if (data) {
          updateCaseInContext(case_id, data);
        }
        break;
        
      case 'scheduled':
        // Case was scheduled to a session - update status
        if (data) {
          updateCaseInContext(case_id, data);
        }
        break;
        
      case 'unscheduled':
        // Case was removed from session - update status
        if (data) {
          updateCaseInContext(case_id, data);
        }
        break;
        
      case 'archived':
        // Case was archived - update to archived status but keep in context for calendar display
        if (data) {
          updateCaseInContext(case_id, { ...data, status: 'archived' });
        } else {
          // If no data provided, just update the status to archived
          updateCaseInContext(case_id, { status: 'archived' });
        }
        break;
        
      case 'unarchived':
        // Case was unarchived - update status and add back to list if not already there
        if (data) {
          const existingCase = cases.find(c => c.id === case_id);
          if (existingCase) {
            updateCaseInContext(case_id, { ...data, status: data.status || 'awaiting_surgery' });
          } else {
            addCase({ ...data, status: data.status || 'awaiting_surgery' });
          }
        }
        break;
        
      case 'delete':
      case 'deleted':
        // Case was deleted - remove from list
        deleteCaseInContext(case_id);
        setRefreshTrigger(prev => prev + 1);
        break;
        
      case 'bulk_update':
        // Handle bulk case updates in real-time
        if (message.case_ids && message.data) {
          // Update multiple cases at once
          message.case_ids.forEach((id: string) => {
            updateCaseInContext(id, message.data);
          });
        }
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          if (data.archived) {
            deleteCaseInContext(case_id);
          } else {
            addCase(data);
          }
        }
        break;
    }
  }, [cases, addCase, updateCaseInContext, deleteCaseInContext]);

  const handleWebSocketSessionUpdate = useCallback((message: any) => {
    const { action, session_id, data, case_id, schedule_id } = message;
    
    switch (action) {
      case 'created':
        // New session created
        if (data) {
          addSession(data);
        }
        break;
        
      case 'updated':
        // Session updated
        if (data) {
          updateSession(session_id, data);
        }
        break;
        
      case 'deleted':
        // Session deleted
        deleteSession(session_id);
        break;
        
      case 'case_added':
        // Case added to session - WebSocket will handle schedule updates
        console.log('Case added to session:', case_id, session_id);
        break;
        
      case 'case_removed':
        // Case removed from session - WebSocket will handle schedule updates
        console.log('Case removed from session:', case_id, session_id);
        break;
        
      case 'case_reordered':
        // Cases reordered in session - WebSocket will handle schedule updates
        console.log('Cases reordered in session:', session_id);
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          console.log('Unknown session action:', action, session_id);
        }
        break;
    }
  }, [addSession, updateSession, deleteSession]);

  const handleWebSocketScheduleUpdate = useCallback((message: any) => {
    const { action, schedule_id, case_id, session_id, data } = message;
    
    switch (action) {
      case 'create':
        // New schedule created
        if (data) {
          setSchedules(prevSchedules => {
            const exists = prevSchedules.find(s => s.id === schedule_id);
            if (!exists) {
              return [...prevSchedules, data];
            }
            return prevSchedules;
          });
        }
        break;
        
      case 'update':
        // Schedule updated
        if (data) {
          setSchedules(prevSchedules => {
            const index = prevSchedules.findIndex(s => s.id === schedule_id);
            if (index !== -1) {
              const newSchedules = [...prevSchedules];
              newSchedules[index] = data;
              return newSchedules;
            }
            return prevSchedules;
          });
        }
        break;
        
      case 'delete':
        // Schedule deleted
        setSchedules(prevSchedules => 
          prevSchedules.filter(s => s.id !== schedule_id)
        );
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          setSchedules(prevSchedules => {
            const index = prevSchedules.findIndex(s => s.id === schedule_id);
            if (index !== -1) {
              const newSchedules = [...prevSchedules];
              newSchedules[index] = data;
              return newSchedules;
            } else {
              return [...prevSchedules, data];
            }
          });
        }
        break;
    }
  }, [setSchedules]);

  const handleWebSocketBulkScheduleUpdate = useCallback((message: any) => {
    const { action, schedules } = message;
    
    if (action === 'reorder' && schedules && Array.isArray(schedules)) {
      setSchedules(prevSchedules => {
        // Replace all schedules for the affected session
        const sessionId = schedules[0]?.session_id;
        if (sessionId) {
          const otherSchedules = prevSchedules.filter(s => s.session_id !== sessionId);
          return [...otherSchedules, ...schedules];
        }
        return prevSchedules;
      });
    }
  }, [setSchedules]);

  const handleWebSocketTheatreUpdate = useCallback((message: any) => {
    const { action, theatre_id, data } = message;
    
    switch (action) {
      case 'created':
        // New theatre created
        if (data) {
          addTheatre(data);
        }
        break;
        
      case 'updated':
        // Theatre updated
        if (data) {
          updateTheatre(theatre_id, data);
        }
        break;
        
      case 'deleted':
        // Theatre deleted
        deleteTheatre(theatre_id);
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          console.log('Unknown theatre action:', action, theatre_id);
        }
        break;
    }
  }, [addTheatre, updateTheatre, deleteTheatre]);

  // Initialize WebSocket connection after all handlers are defined and data is fully loaded
  useEffect(() => {
    if (auth.isAuthenticated() && isInitialized && !isDataLoading) {
      const wsClient = require('@/lib/websocket').default;
      
      console.log('🔌 Initializing WebSocket connection...');
      
      wsClient.onCaseUpdate(handleWebSocketCaseUpdate);
      wsClient.onSessionUpdate(handleWebSocketSessionUpdate);
      wsClient.onScheduleUpdate(handleWebSocketScheduleUpdate);
      wsClient.onBulkScheduleUpdate(handleWebSocketBulkScheduleUpdate);
      wsClient.onTheatreUpdate(handleWebSocketTheatreUpdate);
      
      setWsClient(wsClient);

      return () => {
        console.log('🔌 Disconnecting WebSocket...');
        wsClient.disconnect();
      };
    }
  }, [isInitialized, isDataLoading, handleWebSocketCaseUpdate, handleWebSocketSessionUpdate, handleWebSocketScheduleUpdate, handleWebSocketBulkScheduleUpdate, handleWebSocketTheatreUpdate]);

  // Load schedules for a specific date - use schedule_date directly
  const loadSchedulesForDate = async (date: string) => {
    console.log(`📅 Loading schedules for date: ${date} (called from TraumaBoard)`);
    try {
      // Get schedules directly by date (this is the correct API approach)
      const schedulesResponse = await apiClient.getSchedules({ 
        schedule_date: date 
      });
      setSchedules(schedulesResponse);
      console.log(`✅ Schedules loaded for ${date}: ${schedulesResponse.length} schedules`);
    } catch (error) {
      console.error('Error loading schedules for date:', date, error);
      // Don't show toast error for schedule loading failures
    }
  };

  // Load sessions for a specific date
  const loadSessionsForDate = async (date: string) => {
    console.log(`📅 Loading sessions for date: ${date}`);
    try {
      // Get sessions for the specific date
      const sessionsResponse = await apiClient.getSessions({ 
        session_date: date 
      });
      
      // Update the sessions in the DataContext
      // Since sessions are global, we need to merge with existing sessions from other dates
      // For now, let's replace all sessions (this might need refinement)
      sessionsResponse.forEach(session => {
        const existingSession = sessions.find(s => s.id === session.id);
        if (!existingSession) {
          addSession(session);
        } else if (JSON.stringify(existingSession) !== JSON.stringify(session)) {
          updateSession(session.id, session);
        }
      });
      
      console.log(`✅ Sessions loaded for ${date}: ${sessionsResponse.length} sessions`);
    } catch (error) {
      console.error('Error loading sessions for date:', date, error);
    }
  };

  // Load cases for a specific date - use schedules instead of surgery dates
  const loadCasesForDate = async (date: string) => {
    try {
      console.log(`📅 Loading cases for date: ${date}`);
      
      // Get schedules for the specific date
      const schedulesResponse = await apiClient.getSchedules({ 
        schedule_date: date 
      });
      
      console.log(`📅 Found ${schedulesResponse.length} schedules for date ${date}`);
      
      // Extract case IDs from schedules
      const scheduledCaseIds = schedulesResponse
        .map(schedule => schedule.case_id)
        .filter(id => id); // Remove any undefined case_ids
      
      console.log(`📅 Scheduled case IDs:`, scheduledCaseIds);
      
      // Get cases that are scheduled for this date
      if (scheduledCaseIds.length > 0) {
        // Filter from existing cases first
        const scheduledCases = cases.filter(c => scheduledCaseIds.includes(c.id));
        console.log(`📅 Already have ${scheduledCases.length} cases in context`);
        
        // If we don't have all the cases, fetch them individually
        const missingCaseIds = scheduledCaseIds.filter(id => 
          !scheduledCases.some(c => c.id === id)
        );
        
        console.log(`📅 Missing case IDs to fetch:`, missingCaseIds);
        
        if (missingCaseIds.length > 0) {
          // Fetch missing cases one by one (since we can't batch by ID)
          for (const caseId of missingCaseIds) {
            try {
              console.log(`📅 Fetching case: ${caseId}`);
              const caseData = await apiClient.getCase(caseId);
              console.log(`📅 Fetched case data:`, caseData.name, caseData.status);
              
              // Check if case already exists to prevent duplicates
              const existingCase = cases.find(c => c.id === caseId);
              if (!existingCase) {
                console.log(`📅 Adding case to context: ${caseId}`);
                addCase(caseData);
              } else {
                console.log(`🔄 Case ${caseId} already exists, skipping duplicate add in loadCasesForDate`);
              }
            } catch (error) {
              console.error(`Error fetching case ${caseId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading cases for date:', date, error);
    }
  };

  // Case management handlers
  const handleCreateCase = async (caseData: any) => {
    try {
      const newCase = await apiClient.createCase(caseData);
      addCase(newCase);
      toast.success('Case created successfully');
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Failed to create case');
    }
  };

  const handleUpdateCase = async (caseId: string, updates: any) => {
    try {
      const updatedCase = await apiClient.updateCase(caseId, updates);
      updateCaseInContext(caseId, updatedCase);
      toast.success('Case updated successfully');
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await apiClient.deleteCase(caseId);
      deleteCaseInContext(caseId);
      toast.success('Case deleted successfully');
    } catch (error) {
      console.error('Error deleting case:', error);
      toast.error('Failed to delete case');
    }
  };

  const handleCompleteCase = async (caseId: string) => {
    try {
      const updatedCase = await apiClient.updateCase(caseId, { status: 'completed' });
      updateCaseInContext(caseId, updatedCase);
      toast.success('Case marked as completed');
    } catch (error) {
      console.error('Error completing case:', error);
      toast.error('Failed to complete case');
    }
  };

  const handleArchiveCase = async (caseId: string) => {
    try {
      await apiClient.archiveCase(caseId);
      // Update case to archived status but keep in context for calendar display
      updateCaseInContext(caseId, { status: 'archived' });
      toast.success('Case archived successfully');
    } catch (error) {
      console.error('Error archiving case:', error);
      toast.error('Failed to archive case');
    }
  };

  // Remove legacy direct date assignment - only theatre-based scheduling supported
  // const handleDropOnDate = async (caseId: string, date: string, orderIndex?: number) => {
  //   // This function is deprecated - use handleDropOnSession instead
  // };

  const handleDropOnSession = async (caseId: string, sessionId: string, timeSlot: string) => {
    try {
      // Find the session to get the date and theatre
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get the next order index for this session
      const existingSchedules = await apiClient.getSchedules({ session_id: sessionId });
      const nextOrderIndex = existingSchedules.length + 1;

      // Create a case schedule to link the case to the session
      const scheduleData: CaseScheduleCreate = {
        case_id: caseId,
        session_id: sessionId,
        scheduled_date: session.session_date,
        start_time: session.start_time.substring(0, 5), // Format to HH:MM
        end_time: session.end_time.substring(0, 5), // Format to HH:MM
        estimated_duration: 120, // Default 2 hours in minutes
        order_index: nextOrderIndex,
        status: 'scheduled',
        notes: `Scheduled via drag & drop to ${session.session_type} session`
      };

      // Create the schedule
      await apiClient.createSchedule(scheduleData);

      // Update case status to scheduled
      const updates: any = {
        status: 'scheduled'
      };

      await handleUpdateCase(caseId, updates);
      
      // WebSocket will handle real-time schedule updates
      toast.success('Case scheduled to session successfully');
    } catch (error) {
      console.error('Error dropping case on session:', error);
      toast.error('Failed to schedule case to session');
    }
  };

  const handleUnscheduleCase = async (caseId: string) => {
    try {
      // Find the schedule for this case
      const schedules = await apiClient.getSchedules({ case_id: caseId });
      
      if (schedules.length === 0) {
        throw new Error('No schedule found for this case');
      }

      // Delete the schedule first
      await apiClient.deleteSchedule(schedules[0].id);

      // Then update case status back to awaiting_surgery
      const updates: any = {
        status: 'awaiting_surgery'
      };

      await handleUpdateCase(caseId, updates);
      
      // WebSocket will handle real-time schedule updates
      toast.success('Case unscheduled successfully');
    } catch (error) {
      console.error('Error unscheduling case:', error);
      toast.error('Failed to unschedule case');
    }
  };

  const handleMoveCase = async (caseId: string, newSessionId: string, newOrderIndex?: number) => {
    try {
      // Find the current schedule for this case
      const currentSchedules = await apiClient.getSchedules({ case_id: caseId });
      
      if (currentSchedules.length === 0) {
        throw new Error('No schedule found for this case');
      }

      const currentSchedule = currentSchedules[0];
      
      // Find the new session
      const newSession = sessions.find(s => s.id === newSessionId);
      if (!newSession) {
        throw new Error('New session not found');
      }

      // Get the next order index if not provided
      let orderIndex = newOrderIndex;
      if (!orderIndex) {
        const newSessionSchedules = await apiClient.getSchedules({ session_id: newSessionId });
        orderIndex = newSessionSchedules.length + 1;
      }

      // Update the schedule
      const updateData: CaseScheduleUpdate = {
        session_id: newSessionId,
        scheduled_date: newSession.session_date,
        start_time: newSession.start_time.substring(0, 5), // Format to HH:MM
        end_time: newSession.end_time.substring(0, 5), // Format to HH:MM
        order_index: orderIndex,
        notes: `Moved to ${newSession.session_type} session`
      };

      await apiClient.updateSchedule(currentSchedule.id, updateData);
      
      // WebSocket will handle real-time schedule updates
      toast.success('Case moved to new session successfully');
    } catch (error) {
      console.error('Error moving case:', error);
      toast.error('Failed to move case');
    }
  };

  // Handle reordering cases within a session
  const handleReorderSchedules = async (scheduleOrders: { schedule_id: string; order_index: number }[]) => {
    try {
      // Get the session ID from the first schedule
      if (scheduleOrders.length === 0) return;
      
      const firstSchedule = schedules.find(s => s.id === scheduleOrders[0].schedule_id);
      if (!firstSchedule) return;
      
      // Extract just the schedule IDs in order
      const scheduleIds = scheduleOrders.map(order => order.schedule_id);
      
      // Call the reorder API
      await apiClient.reorderSchedules(scheduleIds);
      
      // WebSocket will handle real-time schedule updates
      toast.success('Case order updated successfully');
    } catch (error) {
      console.error('Error reordering schedules:', error);
      toast.error('Failed to reorder cases');
    }
  };

  const handleDropOnSection = async (caseIdOrScheduleId: string, newSection: string, newSubspecialty?: string) => {
    try {
      // Check if this is a schedule ID (from calendar drag)
      let caseId = caseIdOrScheduleId;
      if (caseIdOrScheduleId.startsWith('schedule:')) {
        const scheduleId = caseIdOrScheduleId.replace('schedule:', '');
        
        // Find the schedule to get the case ID
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) {
          console.error('Schedule not found:', scheduleId);
          toast.error('Schedule not found');
          return;
        }
        
        caseId = schedule.case_id;
      }
      
      const updates: any = {};
      
      // Handle different section types
      if (newSection === 'new_referral') {
        updates.status = 'new_referral';
        updates.subspecialty = null;
      } else if (newSection === 'completed') {
        updates.status = 'completed';
      } else if (newSection === 'awaiting_surgery') {
        updates.status = 'awaiting_surgery';
        if (newSubspecialty) {
          updates.subspecialty = newSubspecialty === 'unassigned' ? null : newSubspecialty;
        }
      } else {
        // For subspecialty sections, set status to awaiting_surgery and update subspecialty
        updates.status = 'awaiting_surgery';
        updates.subspecialty = newSection;
      }
      
      // Clear surgery_date when moving back to main board (unless it's completed)
      const currentCase = cases.find(c => c.id === caseId);
      if (currentCase?.surgery_date && newSection !== 'completed') {
        updates.surgery_date = null;
      }
      
      await handleUpdateCase(caseId, updates);
    } catch (error) {
      console.error('Error dropping case on section:', error);
      toast.error('Failed to move case');
    }
  };

  // Session management handlers
  const handleCreateSession = async (sessionData: TheatreSessionCreate) => {
    try {
      const newSession = await apiClient.createSession(sessionData);
      addSession(newSession);
      toast.success('Session created successfully');
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const handleUpdateSession = async (sessionId: string, updates: TheatreSessionUpdate) => {
    try {
      const updatedSession = await apiClient.updateSession(sessionId, updates);
      updateSession(sessionId, updatedSession);
      toast.success('Session updated successfully');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiClient.deleteSession(sessionId);
      deleteSession(sessionId);
      toast.success('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Handle date change from calendar - with debouncing to prevent duplicate calls
  const handleDateChange = useCallback(async (date: string) => {
    // Prevent duplicate processing during React Strict Mode cycles
    if (lastProcessedDate.current === date) {
      console.log(`🚫 Date ${date} already processed, skipping duplicate call`);
      return;
    }
    
    console.log(`🔄 Date change detected: ${date} (TraumaBoard)`);
    lastProcessedDate.current = date;
    
    await Promise.all([
      loadSchedulesForDate(date),
      loadSessionsForDate(date),
      loadCasesForDate(date)
    ]);
  }, [loadSchedulesForDate, loadSessionsForDate, loadCasesForDate]);

  if (isDataLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {!isAdmin && (
        <header className="bg-white shadow-sm border-b flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center space-x-6">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Trauma Board</h1>
                  <p className="text-xs text-gray-600">
                    Welcome back, {user?.first_name} {user?.last_name}
                  </p>
                </div>
                <NotificationPanel />
                {/* WebSocket Status Indicator */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    wsClient?.isConnected() ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-500">
                    {wsClient?.getConnectionStatus() || 'disconnected'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => router.push('/')}
                      className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Back to Main
                    </button>
                    <button
                      onClick={() => router.push('/admin')}
                      className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700"
                    >
                      Admin Panel
                    </button>
                  </>
                )}

                <button
                  onClick={() => auth.logout()}
                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content - Scrollable with bottom padding for flexible calendar */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '70vh' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Stats */}
          <DashboardStats />

          {/* Cases Table */}
          <CasesTable
            cases={cases}
            onCreateCase={handleCreateCase}
            onUpdateCase={handleUpdateCase}
            onDeleteCase={handleDeleteCase}
            onCompleteCase={handleCompleteCase}
            onArchiveCase={handleArchiveCase}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onDropOnSection={handleDropOnSection}
          />
        </div>
      </main>

      {/* Single Day Calendar - Fixed at Bottom */}
      <SingleDayCalendar
        cases={cases}
        theatres={theatres}
        sessions={sessions}
        schedules={schedules}
        onCompleteCase={handleCompleteCase}
        onUpdateCase={handleUpdateCase}
        onDropOnSection={handleDropOnSection}
        onDropOnSession={handleDropOnSession}
        onUnscheduleCase={handleUnscheduleCase}
        onMoveCase={handleMoveCase}
        onReorderSchedules={handleReorderSchedules}
        onSessionCreate={handleCreateSession}
        onSessionUpdate={handleUpdateSession}
        onSessionDelete={handleDeleteSession}
        onDateChange={handleDateChange}
      />
    </div>
  );
}
