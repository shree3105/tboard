'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Case, CaseStatus, SessionType, TheatreSession, CaseSchedule, UserSimple } from '@/lib/types';
import { getCaseStatusColor } from '@/lib/colors';
import { Plus, Edit, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api';
import { useData } from '@/lib/DataContext';

interface SingleDayCalendarProps {
  cases: Case[];
  theatres: any[];
  sessions: TheatreSession[];
  schedules: CaseSchedule[];
  onCompleteCase: (caseId: string) => void;
  onUpdateCase: (caseId: string, updates: any) => void;
  onDropOnSection: (caseId: string, newSection: string, newSubspecialty?: string) => void;
  onDropOnSession: (caseId: string, sessionId: string, timeSlot: string) => void;
  onUnscheduleCase: (caseId: string) => void;
  onMoveCase: (caseId: string, newSessionId: string, newOrderIndex?: number) => void;
  onReorderSchedules: (scheduleOrders: { schedule_id: string; order_index: number }[]) => Promise<void>;
  onSessionCreate: (sessionData: any) => Promise<void>;
  onSessionUpdate: (sessionId: string, updates: any) => Promise<void>;
  onSessionDelete: (sessionId: string) => Promise<void>;
  onDateChange: (date: string) => void;
}

export default function SingleDayCalendar({
  cases,
  theatres,
  sessions,
  schedules,
  onCompleteCase,
  onUpdateCase,
  onDropOnSection,
  onDropOnSession,
  onUnscheduleCase,
  onMoveCase,
  onReorderSchedules,
  onSessionCreate,
  onSessionUpdate,
  onSessionDelete,
  onDateChange
}: SingleDayCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedCaseData, setDraggedCaseData] = useState<any>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editSessionData, setEditSessionData] = useState<{
    theatre_id: string;
    session_date: string;
    session_type: SessionType;
    start_time: string;
    end_time: string;
    consultant_id: string | null;
    anaesthetist_id: string | null;
    notes: string;
  } | null>(null);
  
  // Reordering state
  const [reorderingSession, setReorderingSession] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedScheduleId, setDraggedScheduleId] = useState<string | null>(null);
  
  // Drag feedback state
  const [dragOverSession, setDragOverSession] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTheatre, setDragOverTheatre] = useState<string | null>(null);
  
  // Use centralized data from context
  const { consultants, anaesthetists } = useData();

  const [newSessionData, setNewSessionData] = useState<{
    theatre_id: string;
    session_date: string;
    session_type: SessionType;
    start_time: string;
    end_time: string;
    consultant_id: string | null;
    anaesthetist_id: string | null;
    notes: string;
  }>({
    theatre_id: '',
    session_date: format(new Date(), 'yyyy-MM-dd'),
    session_type: 'morning' as SessionType,
    start_time: '08:00',
    end_time: '12:00',
    consultant_id: null,
    anaesthetist_id: null,
    notes: ''
  });

  // Update session date when current date changes
  useEffect(() => {
    setNewSessionData(prev => ({
      ...prev,
      session_date: format(currentDate, 'yyyy-MM-dd')
    }));
  }, [currentDate]);

  // Load data when date changes
  useEffect(() => {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    onDateChange(dateStr);
  }, [currentDate]); // Remove onDateChange from dependencies to prevent infinite loop

  // Get theatres that have sessions for the current date
  const getTheatresForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const sessionsForDate = sessions.filter(s => s.session_date === dateStr);
    const theatreIds = Array.from(new Set(sessionsForDate.map(s => s.theatre_id)));
    
    // Only return theatres that have sessions for this date
    return theatres
      .filter(theatre => theatreIds.includes(theatre.id))
      .map(theatre => ({
        ...theatre,
        hasSessions: true // All returned theatres have sessions
      }));
  };

  // Get sessions for a specific theatre and date
  const getSessionsForTheatre = (date: Date, theatreId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions
      .filter(s => s.session_date === dateStr && s.theatre_id === theatreId)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  // Get cases for a specific session
  const getCasesForSession = (sessionId: string) => {
    // Get schedules for this session
    const sessionSchedules = schedules.filter(s => s.session_id === sessionId);

    // Get the cases that are scheduled for this session
    // Only show cases with status: scheduled, completed, or archived
    return sessionSchedules
      .map(schedule => cases.find(c => c.id === schedule.case_id))
      .filter(c => c !== undefined && ['scheduled', 'completed', 'archived'].includes(c.status))
      .sort((a, b) => {
        const scheduleA = sessionSchedules.find(s => s.case_id === a!.id);
        const scheduleB = sessionSchedules.find(s => s.case_id === b!.id);
        return (scheduleA?.order_index || 0) - (scheduleB?.order_index || 0);
      });
  };

  // Handle day navigation
  const handlePreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1));
  };

  // Handle today button
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, caseData: Case) => {
    setDraggedCaseData(caseData);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', caseData.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedCaseData(null);
    setDragOverSession(null);
    setDragOverTheatre(null);
    setDraggedScheduleId(null);
    setReorderingSession(null);
    setDragOverIndex(null);
  };

  // Reordering handlers
  const handleReorderDragStart = (e: React.DragEvent, scheduleId: string, sessionId: string) => {
    e.stopPropagation();
    setDraggedScheduleId(scheduleId);
    setReorderingSession(sessionId);
    e.dataTransfer.setData('text/plain', `schedule:${scheduleId}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleReorderDrop = async (e: React.DragEvent, targetIndex: number, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dragData = e.dataTransfer.getData('text/plain');
    if (!dragData.startsWith('schedule:')) return;
    
    const scheduleId = dragData.replace('schedule:', '');
    
    try {
      // Get all schedules for this session
      const sessionSchedules = schedules.filter(s => s.session_id === sessionId);
      const currentSchedule = sessionSchedules.find(s => s.id === scheduleId);
      
      if (!currentSchedule) return;
      
      // Calculate new order indices
      const newOrder = sessionSchedules
        .filter(s => s.id !== scheduleId) // Remove dragged item
        .map((schedule, idx) => ({
          schedule_id: schedule.id,
          order_index: idx >= targetIndex ? idx + 1 : idx
        }));
      
      // Insert dragged item at target position
      newOrder.splice(targetIndex, 0, {
        schedule_id: scheduleId,
        order_index: targetIndex
      });
      
      // Call reorder API
      await onReorderSchedules(newOrder);
    } catch (error) {
      console.error('Error reordering:', error);
    } finally {
      // Reset state
      setDraggedScheduleId(null);
      setReorderingSession(null);
      setDragOverIndex(null);
    }
  };

  const handleReorderDragEnd = () => {
    setDraggedScheduleId(null);
    setReorderingSession(null);
    setDragOverIndex(null);
  };

  const handleDropOnSession = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault();
    const dragData = e.dataTransfer.getData('text/plain');
    
    if (dragData.startsWith('schedule:')) {
      // This is a schedule being dragged
      const scheduleId = dragData.replace('schedule:', '');
      
      // Find the schedule being dragged
      const draggedSchedule = schedules.find(s => s.id === scheduleId);
      if (!draggedSchedule) {
        return;
      }
      
      // Check if we're moving to a different session
      if (draggedSchedule.session_id !== sessionId) {
        // Move the schedule to the new session
        onMoveCase(draggedSchedule.case_id, sessionId);
      } else {
        // Same session - let reorder handlers deal with it
        return;
      }
    } else {
      // This is a case being dragged from the main table
      const caseId = dragData;
      if (caseId) {
        // Check if this case is already scheduled in another session
        const existingSchedule = schedules.find(s => s.case_id === caseId);
        if (existingSchedule && existingSchedule.session_id !== sessionId) {
          // Move case to new session
          onMoveCase(caseId, sessionId);
        } else {
          // Schedule new case
          onDropOnSession(caseId, sessionId, 'default');
        }
      }
    }
    setDragOverSession(null);
  };

  const handleSessionDragOver = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSession(sessionId);
  };

  const handleSessionDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSession(null);
  };

  const handleTheatreDragOver = (e: React.DragEvent, theatreId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTheatre(theatreId);
  };

  const handleTheatreDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTheatre(null);
  };

  // Session management handlers
  const handleCreateSession = async () => {
    try {
      // Validate required fields
      if (!newSessionData.theatre_id) {
        alert('Please select a theatre');
        return;
      }
      if (!newSessionData.session_date) {
        alert('Please select a session date');
        return;
      }
      if (!newSessionData.start_time) {
        alert('Please enter a start time');
        return;
      }
      if (!newSessionData.end_time) {
        alert('Please enter an end time');
        return;
      }

      await onSessionCreate(newSessionData);
      
      setIsCreatingSession(false);
      setNewSessionData({
        theatre_id: '',
        session_date: format(currentDate, 'yyyy-MM-dd'),
        session_type: 'morning',
        start_time: '08:00',
        end_time: '12:00',
        consultant_id: null,
        anaesthetist_id: null,
        notes: ''
      });
    } catch (error) {
      console.error('❌ Error creating session:', error);
    }
  };

  const handleEditSession = async (sessionId: string, updates: any) => {
    try {
      await onSessionUpdate(sessionId, updates);
      setEditingSession(null);
      setEditSessionData(null);
    } catch (error) {
      console.error('❌ Error updating session:', error);
    }
  };

  const handleStartEditSession = (session: TheatreSession) => {
    setEditingSession(session.id);
    setEditSessionData({
      theatre_id: session.theatre_id,
      session_date: session.session_date,
      session_type: session.session_type,
      start_time: session.start_time,
      end_time: session.end_time,
      consultant_id: session.consultant_id || null,
      anaesthetist_id: session.anaesthetist_id || null,
      notes: session.notes || ''
    });
  };

  const handleCancelEditSession = () => {
    setEditingSession(null);
    setEditSessionData(null);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await onSessionDelete(sessionId);
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  // Handle dragging cases back to main table (for unscheduling)
  const handleDragBackToMain = (caseId: string) => {
    onUnscheduleCase(caseId);
  };

  // Handle drag start for unscheduling (dragging off calendar)
  const handleUnscheduleDragStart = (e: React.DragEvent, caseId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', caseId); // Use case ID for unscheduling
    e.dataTransfer.effectAllowed = 'move';
  };

  // Get color for case status
  const getCaseColor = (status: CaseStatus) => {
    const colors = getCaseStatusColor(status);
    return `${colors.background} ${colors.border} ${colors.text}`;
  };

  // Get color for session type
  const getSessionTypeColor = (type: SessionType) => {
    switch (type) {
      case 'morning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'afternoon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'evening': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'weekend': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const theatresWithSessions = getTheatresForDate(currentDate);
  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10 flex flex-col" style={{ minHeight: '33vh', maxHeight: '70vh' }}>
      {/* Calendar Header */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">Single Day Theatre Schedule</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousDay}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={handleToday}
              className={`px-2 py-1 text-xs rounded ${
                isToday 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <span className="text-xs text-gray-600">
              {format(currentDate, 'EEEE, MMM d, yyyy')}
            </span>
            <button
              onClick={handleNextDay}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Next
            </button>
            <button
              onClick={() => setIsCreatingSession(true)}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-1"
            >
              <Plus className="h-3 w-3" />
              <span>New Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {theatresWithSessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-gray-500">No sessions scheduled for this date</div>
            <div className="text-xs text-gray-400 mt-1">Create a session to start scheduling cases</div>
          </div>
        ) : (
                     <div className="grid gap-4" style={{ 
             gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
             maxWidth: '100%'
           }}>
             {theatresWithSessions.map(theatre => {
               const theatreSessions = getSessionsForTheatre(currentDate, theatre.id);
               const isDragOverTheatre = dragOverTheatre === theatre.id;
               
               return (
                 <div 
                   key={theatre.id} 
                   className={`border rounded-lg transition-all duration-200 ${
                     isDragOverTheatre 
                       ? 'border-blue-400 bg-blue-50 shadow-lg' 
                       : 'border-gray-200'
                   }`}
                   onDragOver={(e) => handleTheatreDragOver(e, theatre.id)}
                   onDragLeave={handleTheatreDragLeave}
                 >
                   {/* Theatre Header */}
                   <div className={`px-3 py-2 border-b transition-colors duration-200 ${
                     isDragOverTheatre 
                       ? 'bg-blue-100 border-blue-300' 
                       : 'bg-indigo-50 border-gray-200'
                   }`}>
                     <h3 className="text-sm font-medium text-indigo-900">{theatre.name}</h3>
                   </div>
                  
                  {/* Sessions */}
                  <div className="p-3">
                    {theatreSessions.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-2">
                        No sessions scheduled
                      </div>
                    ) : (
                      <div className="space-y-2">
                                                 {theatreSessions.map(session => {
                           const sessionCases = getCasesForSession(session.id);
                           const isEditing = editingSession === session.id;
                           const isDragOverSession = dragOverSession === session.id;
                           
                           return (
                             <div 
                               key={session.id}
                               className={`border rounded p-2 transition-all duration-200 ${
                                 isDragOverSession 
                                   ? 'border-green-400 bg-green-50 shadow-md' 
                                   : 'border-gray-200'
                               }`}
                               onDragOver={(e) => handleSessionDragOver(e, session.id)}
                               onDragLeave={handleSessionDragLeave}
                               onDrop={(e) => handleDropOnSession(e, session.id)}
                             >
                              {/* Session Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className={`px-2 py-1 text-xs rounded border ${getSessionTypeColor(session.session_type)}`}>
                                    {session.session_type}
                                  </div>
                                  <span className="text-xs font-medium">
                                    {session.start_time} - {session.end_time}
                                  </span>
                                  {session.consultant_id && (
                                    <span className="text-xs text-gray-600">
                                      {session.consultant?.first_name && session.consultant?.last_name ? 
                                        `${session.consultant.first_name} ${session.consultant.last_name}` : 
                                        `Dr. ${session.consultant_id.slice(0, 8)}...`}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleStartEditSession(session)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit Session"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete Session"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              
                                                             {/* Session Cases */}
                               {sessionCases.length > 0 && (
                                 <div className="space-y-1">
                                   {sessionCases.map((caseItem, index) => {
                                     if (!caseItem) return null;
                                     
                                     const isDragOverIndex = dragOverIndex === index && reorderingSession === session.id;
                                     
                                     return (
                                       <div
                                         key={caseItem.id}
                                         draggable={caseItem.status !== 'completed' && caseItem.status !== 'archived'}
                                         onDragStart={(e) => {
                                           const schedule = schedules.find(s => s.case_id === caseItem.id);
                                           if (schedule) {
                                             // For reordering within the same session, use schedule ID
                                             // For unscheduling (dragging off calendar), use case ID
                                             // We'll determine this based on the target later
                                             handleReorderDragStart(e, schedule.id, session.id);
                                           } else {
                                             // This shouldn't happen for scheduled cases, but just in case
                                             console.warn('No schedule found for case:', caseItem.id);
                                             e.preventDefault();
                                           }
                                         }}
                                         onDragEnd={handleDragEnd}
                                         onDragOver={(e) => handleReorderDragOver(e, index)}
                                         onDrop={(e) => handleReorderDrop(e, index, session.id)}
                                         className={`p-1 rounded border text-xs cursor-move transition-all duration-200 ${
                                           isDragOverIndex 
                                             ? 'border-yellow-400 bg-yellow-50 shadow-sm' 
                                             : getCaseColor(caseItem.status)
                                         }`}
                                       >
                                         <div className="flex items-center justify-between">
                                           <div>
                                             <div className="font-medium truncate">{caseItem.name}</div>
                                             <div className="text-xs opacity-75">
                                               {caseItem.subspecialty?.replace(/_/g, ' ') || 'Unassigned'}
                                             </div>
                                           </div>
                                           <div className="flex space-x-1">
                                             {caseItem.status !== 'completed' && caseItem.status !== 'archived' && (
                                               <button
                                                 onClick={() => onCompleteCase(caseItem.id)}
                                                 className="px-1 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                               >
                                                 ✓
                                               </button>
                                             )}
                                           </div>
                                         </div>
                                       </div>
                                     );
                                   })}
                                 </div>
                               )}
                              
                                                             {/* Drop Zone */}
                               {sessionCases.length === 0 && (
                                 <div className={`text-xs text-center py-4 border-2 border-dashed rounded transition-all duration-200 ${
                                   isDragOverSession 
                                     ? 'border-green-400 bg-green-50 text-green-600' 
                                     : 'border-gray-200 text-gray-400'
                                 }`}>
                                   {isDragOverSession ? 'Drop case here' : 'Drop cases here'}
                                 </div>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {isCreatingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-96">
            <h3 className="text-sm font-medium mb-4">Create New Session</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Theatre</label>
                <select
                  value={newSessionData.theatre_id}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, theatre_id: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="">Select Theatre</option>
                  {theatres.map(theatre => (
                    <option key={theatre.id} value={theatre.id}>{theatre.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Session Type</label>
                <select
                  value={newSessionData.session_type}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, session_type: e.target.value as SessionType }))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="emergency">Emergency</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newSessionData.start_time}
                    onChange={(e) => setNewSessionData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newSessionData.end_time}
                    onChange={(e) => setNewSessionData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Consultant (Optional)</label>
                <select
                  value={newSessionData.consultant_id || ''}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, consultant_id: e.target.value || null }))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="">Select Consultant</option>
                  {consultants.map(consultant => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.first_name} {consultant.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newSessionData.notes}
                  onChange={(e) => setNewSessionData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  rows={2}
                  placeholder="Session notes"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsCreatingSession(false)}
                className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && editSessionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-96">
            <h3 className="text-sm font-medium mb-4">Edit Session</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Theatre</label>
                <select
                  value={editSessionData.theatre_id}
                  onChange={(e) => setEditSessionData(prev => prev ? { ...prev, theatre_id: e.target.value } : null)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="">Select Theatre</option>
                  {theatres.map(theatre => (
                    <option key={theatre.id} value={theatre.id}>{theatre.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Session Type</label>
                <select
                  value={editSessionData.session_type}
                  onChange={(e) => setEditSessionData(prev => prev ? { ...prev, session_type: e.target.value as SessionType } : null)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="emergency">Emergency</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editSessionData.start_time}
                    onChange={(e) => setEditSessionData(prev => prev ? { ...prev, start_time: e.target.value } : null)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={editSessionData.end_time}
                    onChange={(e) => setEditSessionData(prev => prev ? { ...prev, end_time: e.target.value } : null)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Consultant (Optional)</label>
                <select
                  value={editSessionData.consultant_id || ''}
                  onChange={(e) => setEditSessionData(prev => prev ? { ...prev, consultant_id: e.target.value || null } : null)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                >
                  <option value="">Select Consultant</option>
                  {consultants.map(consultant => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.first_name} {consultant.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editSessionData.notes}
                  onChange={(e) => setEditSessionData(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  rows={2}
                  placeholder="Session notes"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={handleCancelEditSession}
                className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditSession(editingSession, editSessionData)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
