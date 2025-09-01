'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface TraumaBoardProps {
  user?: User;
  isAdmin?: boolean;
}

export default function TraumaBoard({ user, isAdmin = false }: TraumaBoardProps) {
  const router = useRouter();
  
  // State management
  const [cases, setCases] = useState<Case[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [sessions, setSessions] = useState<TheatreSession[]>([]);
  const [schedules, setSchedules] = useState<CaseSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket connection
  const [wsClient, setWsClient] = useState<any>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (auth.isAuthenticated()) {
      const wsClient = require('@/lib/websocket').default;
      
          wsClient.onCaseUpdate(handleWebSocketCaseUpdate);
    wsClient.onSessionUpdate(handleWebSocketSessionUpdate);
    wsClient.onScheduleUpdate(handleWebSocketScheduleUpdate);
    wsClient.onBulkScheduleUpdate(handleWebSocketBulkScheduleUpdate);
    wsClient.onTheatreUpdate(handleWebSocketTheatreUpdate);
      
      setWsClient(wsClient);

      return () => {
        wsClient.disconnect();
      };
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Fetch all non-archived cases for the main table
      const [casesResponse, theatresResponse, sessionsResponse] = await Promise.all([
        apiClient.getCases({ archived: false }),
        apiClient.getTheatres(),
        apiClient.getSessions()
      ]);

      setCases(casesResponse.items);
      setTheatres(theatresResponse);
      setSessions(sessionsResponse);
      setSchedules([]); // Initialize empty, will load per date
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket handlers
  const handleWebSocketCaseUpdate = useCallback((message: any) => {
    const { action, case_id, data, old_status, new_status } = message;
    
    switch (action) {
      case 'create':
        // Add new case to list
        if (data && !data.archived) {
          setCases(prevCases => {
            const exists = prevCases.find(c => c.id === case_id);
            if (!exists) {
              return [...prevCases, data];
            }
            return prevCases;
          });
        }
        break;
        
      case 'update':
        // Update existing case
        if (data) {
          setCases(prevCases => {
            const index = prevCases.findIndex(c => c.id === case_id);
            if (index !== -1) {
              const newCases = [...prevCases];
              newCases[index] = data;
              return newCases;
            }
            return prevCases;
          });
        }
        break;
        
      case 'status_changed':
        // Handle status transition
        if (data) {
          setCases(prevCases => {
            const index = prevCases.findIndex(c => c.id === case_id);
            if (index !== -1) {
              const newCases = [...prevCases];
              newCases[index] = data;
              return newCases;
            }
            return prevCases;
          });
        }
        break;
        
      case 'scheduled':
        // Case was scheduled to a session - update status
        if (data) {
          setCases(prevCases => {
            const index = prevCases.findIndex(c => c.id === case_id);
            if (index !== -1) {
              const newCases = [...prevCases];
              newCases[index] = data;
              return newCases;
            }
            return prevCases;
          });
        }
        break;
        
      case 'unscheduled':
        // Case was removed from session - update status
        if (data) {
          setCases(prevCases => {
            const index = prevCases.findIndex(c => c.id === case_id);
            if (index !== -1) {
              const newCases = [...prevCases];
              newCases[index] = data;
              return newCases;
            }
            return prevCases;
          });
        }
        break;
        
      case 'archive':
        // Case was archived - remove from main list
        setCases(prevCases => prevCases.filter(c => c.id !== case_id));
        break;
        
      case 'unarchive':
        // Case was unarchived - add back to list if not already there
        if (data && !data.archived) {
          setCases(prevCases => {
            const exists = prevCases.find(c => c.id === case_id);
            if (!exists) {
              return [...prevCases, data];
            }
            return prevCases;
          });
        }
        break;
        
      case 'delete':
        // Case was deleted - remove from list
        setCases(prevCases => prevCases.filter(c => c.id !== case_id));
        break;
        
      case 'bulk_update':
        // Refresh multiple cases - trigger a full reload
        if (message.case_ids) {
          // For bulk updates, we'll reload all cases
          fetchInitialData();
        }
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          setCases(prevCases => {
            const index = prevCases.findIndex(c => c.id === case_id);
            if (index !== -1) {
              const newCases = [...prevCases];
              newCases[index] = data;
              return newCases;
            } else if (!data.archived) {
              return [...prevCases, data];
            }
            return prevCases;
          });
        }
        break;
    }
  }, []);

  const handleWebSocketSessionUpdate = useCallback((message: any) => {
    const { action, session_id, data, case_id, schedule_id } = message;
    
    switch (action) {
      case 'create':
        // New session created
        if (data) {
          setSessions(prevSessions => {
            const exists = prevSessions.find(s => s.id === session_id);
            if (!exists) {
              return [...prevSessions, data];
            }
            return prevSessions;
          });
        }
        break;
        
      case 'update':
        // Session updated
        if (data) {
          setSessions(prevSessions => {
            const index = prevSessions.findIndex(s => s.id === session_id);
            if (index !== -1) {
              const newSessions = [...prevSessions];
              newSessions[index] = data;
              return newSessions;
            }
            return prevSessions;
          });
        }
        break;
        
      case 'delete':
        // Session deleted
        setSessions(prevSessions => 
          prevSessions.filter(s => s.id !== session_id)
        );
        break;
        
      case 'case_added':
        // Case added to session - refresh schedules for that session
        if (session_id) {
          // Find the session to get its date
          const session = sessions.find(s => s.id === session_id);
          if (session) {
            loadSchedulesForDate(session.session_date);
          }
        }
        break;
        
      case 'case_removed':
        // Case removed from session - refresh schedules for that session
        if (session_id) {
          const session = sessions.find(s => s.id === session_id);
          if (session) {
            loadSchedulesForDate(session.session_date);
          }
        }
        break;
        
      case 'case_reordered':
        // Cases reordered in session - refresh schedules for that session
        if (session_id) {
          const session = sessions.find(s => s.id === session_id);
          if (session) {
            loadSchedulesForDate(session.session_date);
          }
        }
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          setSessions(prevSessions => {
            const index = prevSessions.findIndex(s => s.id === session_id);
            if (index !== -1) {
              const newSessions = [...prevSessions];
              newSessions[index] = data;
              return newSessions;
            } else {
              return [...prevSessions, data];
            }
          });
        }
        break;
    }
  }, [sessions]);

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
  }, []);

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
  }, []);

  const handleWebSocketTheatreUpdate = useCallback((message: any) => {
    const { action, theatre_id, data } = message;
    
    switch (action) {
      case 'create':
        // New theatre created
        if (data) {
          setTheatres(prevTheatres => {
            const exists = prevTheatres.find(t => t.id === theatre_id);
            if (!exists) {
              return [...prevTheatres, data];
            }
            return prevTheatres;
          });
        }
        break;
        
      case 'update':
        // Theatre updated
        if (data) {
          setTheatres(prevTheatres => {
            const index = prevTheatres.findIndex(t => t.id === theatre_id);
            if (index !== -1) {
              const newTheatres = [...prevTheatres];
              newTheatres[index] = data;
              return newTheatres;
            }
            return prevTheatres;
          });
        }
        break;
        
      case 'delete':
        // Theatre deleted
        setTheatres(prevTheatres => 
          prevTheatres.filter(t => t.id !== theatre_id)
        );
        break;
        
      default:
        // Fallback for unknown actions
        if (data) {
          setTheatres(prevTheatres => {
            const index = prevTheatres.findIndex(t => t.id === theatre_id);
            if (index !== -1) {
              const newTheatres = [...prevTheatres];
              newTheatres[index] = data;
              return newTheatres;
            } else {
              return [...prevTheatres, data];
            }
          });
        }
        break;
    }
  }, []);

  // Load schedules for a specific date
  const loadSchedulesForDate = async (date: string) => {
    try {
      const schedulesResponse = await apiClient.getSchedules({ schedule_date: date });
      setSchedules(schedulesResponse);
    } catch (error) {
      console.error('Error loading schedules for date:', date, error);
      // Don't show toast error for schedule loading failures
    }
  };

  // Load cases for a specific date (scheduled, completed, archived)
  const loadCasesForDate = async (date: string) => {
    try {
      const casesResponse = await apiClient.getCases({ 
        surgery_date: date,
        archived: true 
      });
      
      // Merge with existing cases, avoiding duplicates
      setCases(prevCases => {
        const existingIds = new Set(prevCases.map(c => c.id));
        const newCases = casesResponse.items.filter(c => !existingIds.has(c.id));
        return [...prevCases, ...newCases];
      });
    } catch (error) {
      console.error('Error loading cases for date:', date, error);
    }
  };

  // Case management handlers
  const handleCreateCase = async (caseData: any) => {
    try {
      const newCase = await apiClient.createCase(caseData);
      setCases(prev => [...prev, newCase]);
      toast.success('Case created successfully');
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Failed to create case');
    }
  };

    const handleUpdateCase = async (caseId: string, updates: any) => {
    try {
      const updatedCase = await apiClient.updateCase(caseId, updates);

      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));

      toast.success('Case updated successfully');
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('Failed to update case');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await apiClient.deleteCase(caseId);
      
      setCases(prev => prev.filter(c => c.id !== caseId));
      
      toast.success('Case deleted successfully');
    } catch (error) {
      console.error('Error deleting case:', error);
      toast.error('Failed to delete case');
    }
  };

  const handleCompleteCase = async (caseId: string) => {
    try {
      const updatedCase = await apiClient.updateCase(caseId, { status: 'completed' });
      
      setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
      
      toast.success('Case marked as completed');
    } catch (error) {
      console.error('Error completing case:', error);
      toast.error('Failed to complete case');
    }
  };

  const handleArchiveCase = async (caseId: string) => {
    try {
      await apiClient.archiveCase(caseId);
      
      const currentCase = cases.find(c => c.id === caseId);
      
      if (currentCase) {
        const archivedCase = { ...currentCase, status: 'archived' as CaseStatus };
        
        setCases(prev => prev.filter(c => c.id !== caseId));
      }
      
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
      
      // Manually refresh schedules for this date
      await loadSchedulesForDate(session.session_date);
      
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
      
      // Manually refresh schedules for this date
      await loadSchedulesForDate(schedules[0].scheduled_date);
      
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
      
      // Manually refresh schedules
      await loadSchedulesForDate(newSession.session_date);
      
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
      
      // Manually refresh schedules
      await loadSchedulesForDate(firstSchedule.scheduled_date);
      
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
      setSessions(prev => [...prev, newSession]);
      toast.success('Session created successfully');
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const handleUpdateSession = async (sessionId: string, updates: TheatreSessionUpdate) => {
    try {
      const updatedSession = await apiClient.updateSession(sessionId, updates);
      setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
      toast.success('Session updated successfully');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiClient.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Handle date change from calendar
  const handleDateChange = async (date: string) => {
    await Promise.all([
      loadSchedulesForDate(date),
      loadCasesForDate(date)
    ]);
  };

  if (isLoading) {
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

      {/* Main Content - Scrollable with bottom padding for fixed calendar */}
      <main className="flex-1 overflow-y-auto pb-96">
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
