'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';
import { User, UserSimple } from '@/lib/types';
import { Clock, Save, Calendar, Users, RefreshCw, Plus, Trash2, Edit } from 'lucide-react';

interface SessionTemplate {
  id: string;
  theatre_id: string;
  theatre?: { id: string; name: string };
  start_time: string;
  end_time: string;
  session_type: string;
  consultant_id?: string;
  consultant?: { id: string; first_name: string; last_name: string };
  anaesthetist_id?: string;
  anaesthetist?: { id: string; first_name: string; last_name: string };
  notes?: string;
  is_weekend_template: boolean;
}

export default function SessionConfiguration() {
  const [weekdayTemplates, setWeekdayTemplates] = useState<SessionTemplate[]>([]);
  const [weekendTemplates, setWeekendTemplates] = useState<SessionTemplate[]>([]);
  const [consultants, setConsultants] = useState<UserSimple[]>([]);
  const [anaesthetists, setAnaesthetists] = useState<UserSimple[]>([]);
  const [theatres, setTheatres] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [initializeDate, setInitializeDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionTemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'weekday' | 'weekend'>('weekday');
  const [newSession, setNewSession] = useState<Partial<SessionTemplate>>({
    theatre_id: '',
    start_time: '08:00',
    end_time: '12:00',
    session_type: 'morning',
    consultant_id: '',
    anaesthetist_id: '',
    notes: '',
    is_weekend_template: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [consultantsData, anaesthetistsData, theatresData, weekdayTemplatesData, weekendTemplatesData] = await Promise.all([
        apiClient.getConsultants(),
        apiClient.getAnaesthetists(),
        apiClient.getTheatres(),
        apiClient.admin.getSessionTemplates(false), // Weekday templates
        apiClient.admin.getSessionTemplates(true)   // Weekend templates
      ]);
      
      setConsultants(consultantsData);
      setAnaesthetists(anaesthetistsData);
      setTheatres(theatresData);
      setWeekdayTemplates(weekdayTemplatesData);
      setWeekendTemplates(weekendTemplatesData);
    } catch (error) {
      console.error('Error loading session templates:', error);
      toast.error('Failed to load session templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeSessions = async () => {
    try {
      await apiClient.admin.initializeSessions(initializeDate);
      toast.success(`Sessions initialized for ${initializeDate}`);
    } catch (error) {
      console.error('Error initializing sessions:', error);
      toast.error('Failed to initialize sessions');
    }
  };

  const handleAddSession = async () => {
    if (!newSession.theatre_id || !newSession.start_time || !newSession.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.admin.createSessionTemplate({
        theatre_id: newSession.theatre_id!,
        start_time: newSession.start_time!,
        end_time: newSession.end_time!,
        session_type: newSession.session_type!,
        consultant_id: newSession.consultant_id || undefined,
        anaesthetist_id: newSession.anaesthetist_id || undefined,
        notes: newSession.notes || undefined,
        is_weekend_template: activeTab === 'weekend'
      });

      setNewSession({
        theatre_id: '',
        start_time: '08:00',
        end_time: '12:00',
        session_type: 'morning',
        consultant_id: '',
        anaesthetist_id: '',
        notes: '',
        is_weekend_template: false
      });
      setIsAddingSession(false);
      toast.success('Session template created successfully');
      loadData(); // Reload templates
    } catch (error) {
      console.error('Error creating session template:', error);
      toast.error('Failed to create session template');
    }
  };

  const handleEditSession = (session: SessionTemplate) => {
    setEditingSession(session);
    setNewSession({
      theatre_id: session.theatre_id,
      start_time: session.start_time,
      end_time: session.end_time,
      session_type: session.session_type,
      consultant_id: session.consultant_id || '',
      anaesthetist_id: session.anaesthetist_id || '',
      notes: session.notes || '',
      is_weekend_template: session.is_weekend_template
    });
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !newSession.theatre_id || !newSession.start_time || !newSession.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.admin.updateSessionTemplate(editingSession.id, {
        theatre_id: newSession.theatre_id!,
        start_time: newSession.start_time!,
        end_time: newSession.end_time!,
        session_type: newSession.session_type!,
        consultant_id: newSession.consultant_id || undefined,
        anaesthetist_id: newSession.anaesthetist_id || undefined,
        notes: newSession.notes || undefined,
        is_weekend_template: newSession.is_weekend_template
      });

      setEditingSession(null);
      setNewSession({
        theatre_id: '',
        start_time: '08:00',
        end_time: '12:00',
        session_type: 'morning',
        consultant_id: '',
        anaesthetist_id: '',
        notes: '',
        is_weekend_template: false
      });
      toast.success('Session template updated successfully');
      loadData(); // Reload templates
    } catch (error) {
      console.error('Error updating session template:', error);
      toast.error('Failed to update session template');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session template?')) {
      return;
    }

    try {
      await apiClient.admin.deleteSessionTemplate(sessionId);
      toast.success('Session template deleted successfully');
      loadData(); // Reload templates
    } catch (error) {
      console.error('Error deleting session template:', error);
      toast.error('Failed to delete session template');
    }
  };

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'morning': return 'bg-blue-100 text-blue-800';
      case 'afternoon': return 'bg-orange-100 text-orange-800';
      case 'evening': return 'bg-purple-100 text-purple-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'weekend': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTemplates = activeTab === 'weekday' ? weekdayTemplates : weekendTemplates;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Session Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure session templates for weekdays and weekends. These will be used when initializing new dates.
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Template Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('weekday')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekday'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Weekday Template
            </button>
            <button
              onClick={() => setActiveTab('weekend')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'weekend'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Weekend Template
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                {activeTab === 'weekday' ? 'Weekday Sessions' : 'Weekend Sessions'}
              </h3>
            </div>
            <button
              onClick={() => setIsAddingSession(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </button>
          </div>

          {currentTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No {activeTab} session templates yet</p>
              <p className="text-sm">Click "Add Session" to create your first template</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTemplates.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSessionTypeColor(session.session_type)}`}>
                      {session.session_type}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {session.theatre?.name || `Theatre ${session.theatre_id.slice(0, 8)}...`}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {session.start_time} - {session.end_time}
                            {session.consultant && (
                              <span className="ml-2">
                                • {session.consultant.first_name} {session.consultant.last_name}
                              </span>
                            )}
                            {session.anaesthetist && (
                              <span className="ml-2">
                                • {session.anaesthetist.first_name} {session.anaesthetist.last_name}
                              </span>
                            )}
                          </p>
                          {session.notes && (
                            <p className="text-xs text-gray-500 mt-1">{session.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditSession(session)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit Session"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Session Initialization */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Calendar className="h-5 w-5 text-indigo-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Initialize Sessions</h3>
        </div>

        <div className="max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={initializeDate}
              onChange={(e) => setInitializeDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleInitializeSessions}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Create Sessions for {initializeDate}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Creates sessions for the selected date using the template above. 
            Sessions will be created for all available theatres.
          </p>
        </div>
      </div>

      {/* Add/Edit Session Modal */}
      {(isAddingSession || editingSession) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              {editingSession ? 'Edit Session Template' : `Add ${activeTab === 'weekend' ? 'Weekend' : 'Weekday'} Session Template`}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theatre *</label>
                <select
                  value={newSession.theatre_id || ''}
                  onChange={(e) => setNewSession({ ...newSession, theatre_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Theatre</option>
                  {theatres.map(theatre => (
                    <option key={theatre.id} value={theatre.id}>
                      {theatre.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={newSession.start_time || '08:00'}
                    onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={newSession.end_time || '12:00'}
                    onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                <select
                  value={newSession.session_type || 'morning'}
                  onChange={(e) => setNewSession({ ...newSession, session_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="emergency">Emergency</option>
                  <option value="weekend">Weekend</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Consultant</label>
                <select
                  value={newSession.consultant_id || ''}
                  onChange={(e) => setNewSession({ ...newSession, consultant_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No default consultant</option>
                  {consultants.map(consultant => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.first_name} {consultant.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Anaesthetist</label>
                <select
                  value={newSession.anaesthetist_id || ''}
                  onChange={(e) => setNewSession({ ...newSession, anaesthetist_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No default anaesthetist</option>
                  {anaesthetists.map(anaesthetist => (
                    <option key={anaesthetist.id} value={anaesthetist.id}>
                      {anaesthetist.first_name} {anaesthetist.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newSession.notes || ''}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  placeholder="Optional notes about this session template"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsAddingSession(false);
                  setEditingSession(null);
                  setNewSession({
                    theatre_id: '',
                    start_time: '08:00',
                    end_time: '12:00',
                    session_type: 'morning',
                    consultant_id: '',
                    anaesthetist_id: '',
                    notes: '',
                    is_weekend_template: false
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={editingSession ? handleUpdateSession : handleAddSession}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                {editingSession ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
