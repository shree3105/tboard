'use client';

import { useState, useMemo } from 'react';
import { Case } from '@/lib/types';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { CheckCircle } from 'lucide-react';

interface HorizontalCalendarProps {
  cases: Case[];
  onDrop: (date: string) => Promise<void>;
  onCompleteCase: (caseId: string) => Promise<void>;
  draggedCase: Case | null;
}

export default function HorizontalCalendar({ cases, onDrop, onCompleteCase, draggedCase }: HorizontalCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Generate dates for the current week (7 days)
  const weekDates = useMemo(() => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 6 }); // Start on Saturday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentWeek]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const dateString = format(date, 'yyyy-MM-dd');
    await onDrop(dateString);
  };

  const getCasesForDate = (date: Date) => {
    return cases.filter(caseItem => {
      // Only show on_list cases with surgery dates
      if (caseItem.section !== 'on_list' || !caseItem.surgery_date) {
        return false;
      }
      return isSameDay(new Date(caseItem.surgery_date), date);
    });
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

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const handleComplete = async (caseId: string) => {
    await onCompleteCase(caseId);
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
                draggedCase ? 'border-dashed border-2 border-primary-300' : ''
              }`}
              onDragOver={handleDragOver}
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
              <div className="space-y-2">
                {casesForDate.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="bg-orange-100 text-orange-800 border border-orange-200 p-2 rounded text-xs relative group"
                  >
                    <div className="font-medium truncate">{caseItem.name}</div>
                    <div className="text-xs opacity-75 truncate">{caseItem.diagnosis}</div>
                    <button
                      onClick={() => handleComplete(caseItem.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 hover:text-green-800"
                      title="Complete"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {casesForDate.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-4">
                    No surgeries
                  </div>
                )}
              </div>

              {/* Drop zone indicator */}
              {draggedCase && (
                <div className="mt-2 p-2 border-2 border-dashed border-primary-300 rounded text-center text-primary-600 text-xs">
                  Drop here to schedule
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
          <span>New Referral</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
          <span>Scheduled Surgery</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}
