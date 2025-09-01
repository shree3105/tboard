'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Case, CaseStatus, CaseSubspecialty, SessionType, TheatreSession } from '@/lib/types';
import { getCaseStatusColor } from '@/lib/colors';

interface FixedCalendarProps {
  cases: Case[];
  calendarCases: Case[];
  theatres: any[];
  sessions: TheatreSession[];
  onCompleteCase: (caseId: string) => void;
  onUpdateCase: (caseId: string, updates: any) => void;
  onDropOnSection: (caseId: string, newSection: string, newSubspecialty?: string) => void;
  onDropOnSession: (caseId: string, sessionId: string, timeSlot: string) => void;
  onReorderCases: (caseId: string, targetDate: string, newOrderIndex: number) => void;
  onWeekChange: (startDate: Date, endDate: Date) => void;
  draggedCase: any;
}

export default function FixedCalendar({
  cases,
  calendarCases,
  theatres,
  sessions,
  onCompleteCase,
  onUpdateCase,
  onDropOnSection,
  onDropOnSession,
  onReorderCases,
  onWeekChange,
  draggedCase
}: FixedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedCaseData, setDraggedCaseData] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Generate 3 days (today, tomorrow, day after)
  const days = [
    currentDate,
    addDays(currentDate, 1),
    addDays(currentDate, 2)
  ];

  // Session types in order
  const sessionTypes: SessionType[] = ['morning', 'afternoon', 'evening', 'emergency', 'weekend'];

  // Get cases for a specific date
  const getCasesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarCases
      .filter(c => c.surgery_date === dateStr)
      .sort((a, b) => a.order_index - b.order_index);
  };

  // Get sessions for a specific date and theatre
  const getSessionsForDateAndTheatre = (date: Date, theatreId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter(s => s.session_date === dateStr && s.theatre_id === theatreId);
  };

  // Get cases for a specific session
  const getCasesForSession = (sessionId: string) => {
    return calendarCases.filter(c => {
      // For now, we'll match cases by surgery_date and theatre
      // In the future, this should use the case_schedules table
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return false;
      return c.surgery_date === session.session_date;
    });
  };

  // Get theatres that have sessions for a specific date
  const getTheatresForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const sessionsForDate = sessions.filter(s => s.session_date === dateStr);
    const theatreIds = Array.from(new Set(sessionsForDate.map(s => s.theatre_id)));
    return theatres.filter(t => theatreIds.includes(t.id));
  };

  // Handle day navigation
  const handlePreviousDay = () => {
    const newDate = subDays(currentDate, 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = addDays(currentDate, 1);
    setCurrentDate(newDate);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, caseData: Case) => {
    setDraggedCaseData(caseData);
    e.dataTransfer.setData('text/plain', caseData.id);
  };

  const handleDragOver = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDropTarget(date);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDropTarget(null);
    
    const caseId = e.dataTransfer.getData('text/plain');
    if (!caseId) return;
    
    // Find the case data either from draggedCaseData (internal drag) or from cases prop (external drag)
    let caseData = draggedCaseData;
    if (!caseData) {
      caseData = cases.find(c => c.id === caseId);
    }
    
    if (caseData) {
      // Check if case is completed - don't allow dragging completed cases
      if (caseData.status === 'completed') {
        return;
      }

      // For theatre-based scheduling, we only allow dropping on specific sessions
      // Direct date assignment is no longer supported
      console.log('Direct date assignment not supported. Please drop on a specific session.');
    }
  };

  // Handle dropping on specific session
  const handleDropOnSession = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault();
    setDropTarget(null);
    
    const caseId = e.dataTransfer.getData('text/plain');
    if (!caseId) return;
    
    // Find the case data
    let caseData = draggedCaseData;
    if (!caseData) {
      caseData = cases.find(c => c.id === caseId);
    }
    
    if (caseData && caseData.status !== 'completed') {
      // Call the session drop handler
      onDropOnSession(caseId, sessionId, 'default');
    }
  };

  // Handle dragging cases back to main table (reset to awaiting_surgery)
  const handleDragBackToMain = (caseId: string) => {
    // Reset case to awaiting_surgery and clear surgery date
    onDropOnSection(caseId, 'awaiting_surgery');
  };

  // Handle case completion
  const handleCompleteCase = (caseId: string) => {
    onCompleteCase(caseId);
  };

  // Handle case reordering within a day
  const handleReorderCases = (date: string, caseId: string, newIndex: number) => {
    onReorderCases(caseId, date, newIndex + 1);
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

  return (
    <div className="bg-white border-t border-gray-200">
      {/* Calendar Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">3-Day Theatre Schedule</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousDay}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous Day
            </button>
            <span className="text-sm text-gray-600">
              {format(currentDate, 'MMM d, yyyy')} - {format(addDays(currentDate, 2), 'MMM d, yyyy')}
            </span>
            <button
              onClick={handleNextDay}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next Day
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Day Headers */}
          <div className="grid grid-cols-4 gap-px bg-gray-200">
            <div className="bg-gray-50 p-3 text-center">
              <div className="text-sm font-medium text-gray-900">Session Type</div>
            </div>
            {days.map((day) => {
              const theatresForDay = getTheatresForDate(day);
              return (
                <div key={day.toISOString()} className="bg-gray-50">
                  <div className="p-3 text-center border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(day, 'MMM d')}
                    </div>
                  </div>
                  {theatresForDay.length > 0 ? (
                    <div className="grid grid-cols-1 gap-px">
                      {theatresForDay.map(theatre => (
                        <div key={theatre.id} className="bg-indigo-50 px-1 py-0.5 text-center">
                          <div className="text-xs font-medium text-indigo-900 truncate">
                            {theatre.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-1 text-center">
                      <div className="text-xs text-gray-400">No sessions</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Session Rows */}
          {sessionTypes.map(sessionType => (
            <div key={sessionType} className="grid grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
              {/* Session Type Label */}
              <div className="bg-gray-50 p-1 flex items-center justify-center">
                <div className="text-xs font-medium text-gray-700">
                  {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}
                </div>
              </div>

              {/* Day Columns */}
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const theatresForDay = getTheatresForDate(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-white min-h-12 ${
                      isToday ? 'ring-2 ring-indigo-500' : ''
                    } ${
                      dropTarget === dateStr ? 'bg-indigo-50' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr)}
                  >
                    {theatresForDay.length > 0 ? (
                      <div className="grid grid-cols-1 gap-px">
                        {theatresForDay.map(theatre => {
                          const session = getSessionsForDateAndTheatre(day, theatre.id)
                            .find(s => s.session_type === sessionType);
                          const sessionCases = session ? getCasesForSession(session.id) : [];

                          return (
                            <div key={theatre.id} className="p-0.5">
                              {session ? (
                                <div 
                                  className="p-0.5 rounded border text-xs cursor-pointer hover:bg-gray-50"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => handleDropOnSession(e, session.id)}
                                >
                                  <div className={`p-0.5 rounded border ${getSessionTypeColor(session.session_type)}`}>
                                    <div className="font-medium truncate text-xs">
                                      {session.start_time}
                                    </div>
                                    <div className="text-xs opacity-75">
                                      {session.status}
                                    </div>
                                  </div>
                                  
                                  {/* Cases in this session */}
                                  {sessionCases.map((caseItem, index) => (
                                    <div
                                      key={caseItem.id}
                                      draggable={caseItem.status !== 'completed'}
                                      onDragStart={(e) => handleDragStart(e, caseItem)}
                                      className={`p-0.5 rounded border text-xs cursor-move mt-0.5 ${
                                        getCaseColor(caseItem.status)
                                      } ${caseItem.status === 'completed' ? 'cursor-default' : ''}`}
                                    >
                                      <div className="font-medium truncate text-xs">{caseItem.name}</div>
                                      <div className="text-xs opacity-75">
                                        {caseItem.subspecialty?.replace(/_/g, ' ') || 'Unassigned'}
                                      </div>
                                      <div className="flex space-x-1 mt-0.5">
                                        {caseItem.status !== 'completed' && (
                                          <>
                                            <button
                                              onClick={() => handleCompleteCase(caseItem.id)}
                                              className="px-0.5 py-0 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                            >
                                              ✓
                                            </button>
                                            {caseItem.status === 'scheduled' && (
                                              <button
                                                onClick={() => handleDragBackToMain(caseItem.id)}
                                                className="px-0.5 py-0 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                                title="Move back to main table"
                                              >
                                                ←
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-0.5 text-xs text-gray-400 h-6 flex items-center justify-center border border-dashed border-gray-200 rounded">
                                  -
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-1 text-center">
                        <div className="text-xs text-gray-400">No sessions</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Morning</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
              <span>Afternoon</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
              <span>Evening</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span>Emergency</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Weekend</span>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            💡 Drag cases from main table to specific sessions
          </div>
        </div>
      </div>
    </div>
  );
}
