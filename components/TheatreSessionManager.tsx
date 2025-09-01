'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Calendar, Clock, Users, Save, X } from 'lucide-react';
import { Theatre, TheatreSession, TheatreSessionCreate, TheatreSessionUpdate, SessionType, SessionStatus, UserSimple } from '@/lib/types';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';

interface TheatreSessionManagerProps {
  theatres: Theatre[];
  sessions: TheatreSession[];
  onSessionCreate: (session: TheatreSessionCreate) => Promise<void>;
  onSessionUpdate: (sessionId: string, updates: TheatreSessionUpdate) => Promise<void>;
  onSessionDelete: (sessionId: string) => Promise<void>;
}

export default function TheatreSessionManager({
  theatres,
  sessions,
  onSessionCreate,
  onSessionUpdate,
  onSessionDelete
}: TheatreSessionManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);

  // Consultant and anaesthetist lists
  const [consultants, setConsultants] = useState<UserSimple[]>([]);
  const [anaesthetists, setAnaesthetists] = useState<UserSimple[]>([]);

  // Load consultants and anaesthetists on component mount
  useEffect(() => {
    const loadConsultantsAndAnaesthetists = async () => {
      try {
        const [consultantsData, anaesthetistsData] = await Promise.all([
          apiClient.getConsultants(),
          apiClient.getAnaesthetists()
        ]);
        setConsultants(consultantsData);
        setAnaesthetists(anaesthetistsData);
      } catch (error) {
        console.error('Failed to load consultants and anaesthetists:', error);
      }
    };

    loadConsultantsAndAnaesthetists();
  }, []);

  // Helper function to get consultant display name
  const getConsultantDisplayName = (session: TheatreSession): string => {
    if (session.consultant?.first_name && session.consultant?.last_name) {
      return `${session.consultant.first_name} ${session.consultant.last_name}`;
    }
    if (session.consultant_id) {
      return `Consultant ${session.consultant_id.slice(0, 8)}...`;
    }
    return 'Unassigned';
  };

  // Helper function to get anaesthetist display name
  const getAnaesthetistDisplayName = (session: TheatreSession): string => {
    if (session.anaesthetist?.first_name && session.anaesthetist?.last_name) {
      return `${session.anaesthetist.first_name} ${session.anaesthetist.last_name}`;
    }
    if (session.anaesthetist_id) {
      return `Anaesthetist ${session.anaesthetist_id.slice(0, 8)}...`;
    }
    return 'Unassigned';
  };
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTheatre, setSelectedTheatre] = useState<string>('');

  // Session form state
  const [sessionForm, setSessionForm] = useState<TheatreSessionCreate>({
    theatre_id: '',
    session_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '17:00',
    session_type: 'morning',
    consultant_id: null,
    anaesthetist_id: null,
    notes: null
  });

  // Edit form state
  const [editForm, setEditForm] = useState<TheatreSessionUpdate>({
    theatre_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
    session_type: 'morning',
    consultant_id: null,
    anaesthetist_id: null,
    notes: null
  });

  // Filter sessions by selected theatre and date
  const filteredSessions = sessions.filter(session => {
    const matchesTheatre = !selectedTheatre || session.theatre_id === selectedTheatre;
    const matchesDate = session.session_date === selectedDate;
    return matchesTheatre && matchesDate;
  });

  // Initialize edit form when editing session
  useEffect(() => {
    if (editingSession) {
      const session = sessions.find(s => s.id === editingSession);
      if (session) {
        setEditForm({
          theatre_id: session.theatre_id,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          session_type: session.session_type,
          consultant_id: session.consultant_id,
          anaesthetist_id: session.anaesthetist_id,
          notes: session.notes
        });
      }
    }
  }, [editingSession, sessions]);

  const handleCreateSession = async () => {
    try {
      await onSessionCreate(sessionForm);
      setIsCreating(false);
      setSessionForm({
        theatre_id: '',
        session_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '08:00',
        end_time: '17:00',
        session_type: 'morning',
        consultant_id: null,
        anaesthetist_id: null,
        notes: null
      });
      toast.success('Session created successfully');
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const handleUpdateSession = async (sessionId: string, updates: TheatreSessionUpdate) => {
    try {
      await onSessionUpdate(sessionId, updates);
      setEditingSession(null);
      toast.success('Session updated successfully');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await onSessionDelete(sessionId);
        toast.success('Session deleted successfully');
      } catch (error) {
        console.error('Error deleting session:', error);
        toast.error('Failed to delete session');
      }
    }
  };

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

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Theatre Sessions</h2>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theatre</label>
            <select
              value={selectedTheatre}
              onChange={(e) => setSelectedTheatre(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Theatres</option>
              {theatres.map(theatre => (
                <option key={theatre.id} value={theatre.id}>
                  {theatre.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Create Session Form */}
      {isCreating && (
        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theatre</label>
              <select
                value={sessionForm.theatre_id}
                onChange={(e) => setSessionForm(prev => ({ ...prev, theatre_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Theatre</option>
                {theatres.map(theatre => (
                  <option key={theatre.id} value={theatre.id}>
                    {theatre.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={sessionForm.session_date}
                onChange={(e) => setSessionForm(prev => ({ ...prev, session_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
              <select
                value={sessionForm.session_type}
                onChange={(e) => setSessionForm(prev => ({ ...prev, session_type: e.target.value as SessionType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="emergency">Emergency</option>
                <option value="weekend">Weekend</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={sessionForm.start_time}
                onChange={(e) => setSessionForm(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={sessionForm.end_time}
                onChange={(e) => setSessionForm(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={sessionForm.notes || ''}
                onChange={(e) => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4">
            <button
              onClick={handleCreateSession}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create Session
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="px-6 py-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No sessions found for the selected criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map(session => {
              const theatre = theatres.find(t => t.id === session.theatre_id);
              const isEditing = editingSession === session.id;
              
              return (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  {isEditing ? (
                    // Edit Form
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900">Edit Session</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Theatre</label>
                                                     <select
                             value={editForm.theatre_id || ''}
                             onChange={(e) => setEditForm(prev => ({ ...prev, theatre_id: e.target.value }))}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                            {theatres.map(theatre => (
                              <option key={theatre.id} value={theatre.id}>
                                {theatre.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                                     <input
                             type="date"
                             value={editForm.session_date || ''}
                             onChange={(e) => setEditForm(prev => ({ ...prev, session_date: e.target.value }))}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                                                     <select
                             value={editForm.session_type || 'morning'}
                             onChange={(e) => setEditForm(prev => ({ ...prev, session_type: e.target.value as SessionType }))}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                            <option value="morning">Morning</option>
                            <option value="afternoon">Afternoon</option>
                            <option value="evening">Evening</option>
                            <option value="emergency">Emergency</option>
                            <option value="weekend">Weekend</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                                     <input
                             type="time"
                             value={editForm.start_time || ''}
                             onChange={(e) => setEditForm(prev => ({ ...prev, start_time: e.target.value }))}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                                     <input
                             type="time"
                             value={editForm.end_time || ''}
                             onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <input
                            type="text"
                            value={editForm.notes || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleUpdateSession(session.id, editForm)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save Changes</span>
                        </button>
                        <button
                          onClick={() => setEditingSession(null)}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {session.start_time} - {session.end_time}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{theatre?.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSessionTypeColor(session.session_type)}`}>
                          {session.session_type}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        <button
                          onClick={() => setEditingSession(session.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {!isEditing && session.notes && (
                    <p className="text-sm text-gray-600 mt-2">{session.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
