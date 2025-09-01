'use client';

import { useState, useEffect } from 'react';
import { CaseSchedule, CaseScheduleCreate, ScheduleStatus } from '@/lib/types';
import { apiClient } from '@/lib/api';

interface CaseScheduleManagerProps {
  caseId: string;
  sessionId: string;
  onScheduleCreated: (schedule: CaseSchedule) => void;
  onScheduleUpdated: (schedule: CaseSchedule) => void;
  onScheduleDeleted: (scheduleId: string) => void;
}

export default function CaseScheduleManager({
  caseId,
  sessionId,
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleDeleted
}: CaseScheduleManagerProps) {
  const [schedules, setSchedules] = useState<CaseSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schedules for this case and session
  useEffect(() => {
    loadSchedules();
  }, [caseId, sessionId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getSchedules({
        case_id: caseId,
        session_id: sessionId
      });
      
      setSchedules(response.data || []);
    } catch (err) {
      setError('Failed to load schedules');
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (scheduleData: CaseScheduleCreate) => {
    try {
      setLoading(true);
      setError(null);
      
      const newSchedule = await apiClient.createSchedule(scheduleData);
      setSchedules(prev => [...prev, newSchedule]);
      onScheduleCreated(newSchedule);
      
      return newSchedule;
    } catch (err) {
      setError('Failed to create schedule');
      console.error('Error creating schedule:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = async (scheduleId: string, updates: Partial<CaseSchedule>) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedSchedule = await apiClient.updateSchedule(scheduleId, updates);
      setSchedules(prev => prev.map(s => s.id === scheduleId ? updatedSchedule : s));
      onScheduleUpdated(updatedSchedule);
      
      return updatedSchedule;
    } catch (err) {
      setError('Failed to update schedule');
      console.error('Error updating schedule:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await apiClient.deleteSchedule(scheduleId);
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      onScheduleDeleted(scheduleId);
    } catch (err) {
      setError('Failed to delete schedule');
      console.error('Error deleting schedule:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (scheduleId: string, newStatus: ScheduleStatus) => {
    await updateSchedule(scheduleId, { status: newStatus });
  };

  const handleDurationChange = async (scheduleId: string, newDuration: number) => {
    await updateSchedule(scheduleId, { estimated_duration: newDuration });
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading schedules...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">Schedules</h4>
      
      {schedules.length === 0 ? (
        <div className="text-sm text-gray-500">No schedules found</div>
      ) : (
        <div className="space-y-2">
          {schedules.map(schedule => (
            <div key={schedule.id} className="p-2 border rounded bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div>Time: {schedule.start_time} - {schedule.end_time}</div>
                  <div>Duration: {schedule.estimated_duration} minutes</div>
                  <div>Status: {schedule.status}</div>
                </div>
                
                <div className="flex space-x-1">
                  <select
                    value={schedule.status}
                    onChange={(e) => handleStatusChange(schedule.id, e.target.value as ScheduleStatus)}
                    className="text-xs border rounded px-1"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  
                  <input
                    type="number"
                    value={schedule.estimated_duration}
                    onChange={(e) => handleDurationChange(schedule.id, parseInt(e.target.value))}
                    className="text-xs border rounded px-1 w-16"
                    min="1"
                  />
                  
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
