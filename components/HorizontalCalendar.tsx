'use client';

import { useState, useMemo } from 'react';
import { Case } from '@/lib/types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { CheckCircle, GripVertical } from 'lucide-react';

interface HorizontalCalendarProps {
  cases: Case[];
  calendarCases: Case[]; // Separate cases for calendar (includes archived and completed)
  onDrop: (date: string) => Promise<void>;
  onCompleteCase: (caseId: string) => Promise<void>;
  onUpdateCase: (caseId: string, updates: Partial<Case>) => Promise<void>;
  onDropOnSection: (caseId: string, newSection: string) => Promise<void>;
  onDropOnDate: (caseId: string, date: string) => Promise<void>;
  onReorderCases: (caseId: string, targetDate: string, newOrderIndex: number) => Promise<void>;
  draggedCase: Case | null;
  onWeekChange: (startDate: Date, endDate: Date) => Promise<void>;
}

export default function HorizontalCalendar({ 
  cases, 
  calendarCases,
  onDrop, 
  onCompleteCase, 
  onUpdateCase, 
  onDropOnSection, 
  onDropOnDate,
  onReorderCases,
  draggedCase,
  onWeekChange
}: HorizontalCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Generate dates for the current week (7 days)
  const weekDates = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 6 }); // Start on Saturday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentWeek]);

  const handleDragOver = (e: React.DragEvent, date?: Date, insertIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      setDragOverDate(dateString);
      setDragOverIndex(insertIndex ?? null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over state if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDate(null);
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, date: Date, insertIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const caseId = e.dataTransfer.getData('text/plain');
    const dateString = format(date, 'yyyy-MM-dd');
    
    setDragOverDate(null);
    setDragOverIndex(null);
    
    if (!caseId) return;

    const draggedCaseData = cases.find(c => c.id === caseId);
    if (!draggedCaseData) return;

    // Check if we're moving to the same date (reordering)
    const isSameDate = draggedCaseData.surgery_date && isSameDay(new Date(draggedCaseData.surgery_date), date);
    
    if (isSameDate && insertIndex !== undefined) {
      // Reordering within the same date
      await onReorderCases(caseId, dateString, insertIndex + 1);
    } else {
      // Moving to a different date
      const casesOnTargetDate = getCasesForDate(date);
      const newOrderIndex = insertIndex !== undefined ? insertIndex + 1 : casesOnTargetDate.length + 1;
      
      await onDropOnDate(caseId, dateString);
      
      // If we have a specific position, update the order
      if (insertIndex !== undefined) {
        await onReorderCases(caseId, dateString, newOrderIndex);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, caseItem: Case) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', caseItem.id);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
    setDragOverIndex(null);
  };

  const handleCaseDragOver = (e: React.DragEvent, date: Date, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragOver(e, date, index);
  };

  const handleCaseDrop = (e: React.DragEvent, date: Date, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    handleDrop(e, date, index);
  };

  const getCasesForDate = (date: Date) => {
    return calendarCases
      .filter(caseItem => {
        // Show any case with surgery date (including archived and completed)
        if (!caseItem.surgery_date) {
          return false;
        }
        return isSameDay(new Date(caseItem.surgery_date), date);
      })
      .sort((a, b) => a.order_index - b.order_index); // Sort by order_index
  };

  const getDayName = (date: Date) => {
    return format(date, 'EEE');
  };

  const getDayNumber = (date: Date) => {
    const day = date.getDate();
    const suffix = getDaySuffix(day);
    return `${day}${suffix}`;
  };

  const getDaySuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isPast = (date: Date) => {
    return date < new Date() && !isToday(date);
  };

  const goToPreviousWeek = async () => {
    const newWeek = addDays(currentWeek, -7);
    setCurrentWeek(newWeek);
    const startDate = startOfWeek(newWeek, { weekStartsOn: 6 });
    const endDate = addDays(startDate, 6);
    await onWeekChange(startDate, endDate);
  };

  const goToNextWeek = async () => {
    const newWeek = addDays(currentWeek, 7);
    setCurrentWeek(newWeek);
    const startDate = startOfWeek(newWeek, { weekStartsOn: 6 });
    const endDate = addDays(startDate, 6);
    await onWeekChange(startDate, endDate);
  };

  const goToToday = async () => {
    const today = new Date();
    setCurrentWeek(today);
    const startDate = startOfWeek(today, { weekStartsOn: 6 });
    const endDate = addDays(startDate, 6);
    await onWeekChange(startDate, endDate);
  };

  const handleComplete = async (caseId: string) => {
    await onCompleteCase(caseId);
  };

  const renderDropIndicator = (date: Date, index: number) => {
    const dateString = format(date, 'yyyy-MM-dd');
    if (dragOverDate === dateString && dragOverIndex === index) {
      return (
        <div className="h-1 bg-primary-500 rounded-full my-1 transition-all duration-200" />
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPreviousWeek}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
        >
          ← Previous Week
        </button>
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            {format(weekDates[0], 'MMM d')} - {format(weekDates[6], 'MMM d, yyyy')}
          </h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextWeek}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
        >
          Next Week →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((date) => {
          const casesForDate = getCasesForDate(date);
          const isCurrentDay = isToday(date);
          const isPastDay = isPast(date);
          const dateString = format(date, 'yyyy-MM-dd');

          return (
            <div
              key={date.toISOString()}
              className={`min-h-[200px] border rounded-lg p-3 ${
                isCurrentDay
                  ? 'border-primary-500 bg-primary-50'
                  : isPastDay
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 bg-white'
              } ${
                draggedCase && dragOverDate === dateString ? 'border-dashed border-2 border-primary-300 bg-primary-25' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
            >
              {/* Date Header */}
              <div className={`text-center mb-3 ${
                isCurrentDay ? 'text-primary-700 font-semibold' : 'text-gray-700'
              }`}>
                <div className="text-sm font-medium">{getDayName(date)}</div>
                <div className="text-lg font-bold">{getDayNumber(date)}</div>
                {isCurrentDay && (
                  <div className="text-xs text-primary-600 mt-1">Today</div>
                )}
              </div>

              {/* Cases for this date */}
              <div className="space-y-1">
                {casesForDate.map((caseItem, index) => (
                  <div key={caseItem.id}>
                    {/* Drop indicator at the top */}
                    {renderDropIndicator(date, index)}
                    
                    <div
                      className={`p-2 rounded text-xs relative group transition-colors ${
                        caseItem.status === 'completed'
                          ? 'bg-green-100 text-green-800 border border-green-200 cursor-default'
                          : caseItem.status === 'archived'
                          ? 'bg-gray-100 text-gray-800 border border-gray-200 cursor-default'
                          : 'bg-orange-100 text-orange-800 border border-orange-200 cursor-grab active:cursor-grabbing hover:bg-orange-200'
                      }`}
                      draggable={caseItem.status !== 'completed' && caseItem.status !== 'archived'}
                      onDragStart={caseItem.status !== 'completed' && caseItem.status !== 'archived' ? (e) => handleDragStart(e, caseItem) : undefined}
                      onDragEnd={handleDragEnd}
                      onDragOver={caseItem.status !== 'completed' && caseItem.status !== 'archived' ? (e) => handleCaseDragOver(e, date, index) : undefined}
                      onDrop={caseItem.status !== 'completed' && caseItem.status !== 'archived' ? (e) => handleCaseDrop(e, date, index) : undefined}
                    >
                      <div className="flex items-center justify-between">
                        {caseItem.status !== 'completed' && caseItem.status !== 'archived' && (
                          <GripVertical className="h-3 w-3 text-orange-600 flex-shrink-0" />
                        )}
                        <div className={`flex-1 min-w-0 ${caseItem.status !== 'completed' && caseItem.status !== 'archived' ? 'ml-1' : ''}`}>
                          <div className="font-medium truncate">{caseItem.name}</div>
                          <div className="text-xs opacity-75 truncate">#{caseItem.hospital_number || 'N/A'}</div>
                          <div className="text-xs opacity-75 truncate">{caseItem.diagnosis}</div>
                        </div>
                        {caseItem.status !== 'completed' && caseItem.status !== 'archived' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleComplete(caseItem.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-800 flex-shrink-0 ml-1"
                            title="Complete"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Drop indicator at the bottom */}
                {casesForDate.length > 0 && renderDropIndicator(date, casesForDate.length)}
                
                {casesForDate.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-4">
                    No surgeries
                  </div>
                )}
              </div>

              {/* Drop zone indicator for empty dates */}
              {draggedCase && casesForDate.length === 0 && dragOverDate === dateString && (
                <div className="mt-2 p-2 border-2 border-dashed border-primary-300 rounded text-center text-primary-600 text-xs">
                  Drop here to schedule
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
}
