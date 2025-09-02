import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from './api';
import { Case, Theatre, TheatreSession, UserSimple, CaseStatisticsResponse } from './types';

interface DataContextType {
  // Data
  cases: Case[];
  theatres: Theatre[];
  sessions: TheatreSession[];
  consultants: UserSimple[];
  anaesthetists: UserSimple[];
  caseStatistics: CaseStatisticsResponse | null;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  refreshCases: () => Promise<void>;
  refreshTheatres: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshConsultants: () => Promise<void>;
  refreshAnaesthetists: () => Promise<void>;
  refreshCaseStatistics: () => Promise<void>;
  
  // Add/Update/Delete methods
  addCase: (caseData: Case) => void;
  updateCase: (caseId: string, updates: Partial<Case>) => void;
  deleteCase: (caseId: string) => void;
  addTheatre: (theatreData: Theatre) => void;
  updateTheatre: (theatreId: string, updates: Partial<Theatre>) => void;
  deleteTheatre: (theatreId: string) => void;
  addSession: (sessionData: TheatreSession) => void;
  updateSession: (sessionId: string, updates: Partial<TheatreSession>) => void;
  deleteSession: (sessionId: string) => void;
}

// Singleton pattern to ensure only one DataProvider instance ever exists
let globalDataProvider: DataContextType | null = null;
let isDataProviderInitialized = false;
let isDataLoading = false; // Track if data is currently loading

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  console.log(`🔗 useData returning context with ${context.cases.length} cases`);
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Add unique identifier to prevent multiple instances
  const providerId = React.useId();
  
  // State
  const [cases, setCases] = useState<Case[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [sessions, setSessions] = useState<TheatreSession[]>([]);
  const [consultants, setConsultants] = useState<UserSimple[]>([]);
  const [anaesthetists, setAnaesthetists] = useState<UserSimple[]>([]);
  const [caseStatistics, setCaseStatistics] = useState<CaseStatisticsResponse | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use ref to track if we're in a critical state (loading data)
  const isCriticalState = React.useRef(false);
  


  // Load all initial data
  const loadInitialData = async () => {
    if (isInitialized || isDataLoading) {
      console.log('🚫 Data already initialized or loading, skipping load');
      return; // Prevent multiple loads
    }
    
    console.log('🔄 Starting initial data load...');
    isDataLoading = true;
    isCriticalState.current = true;
    setIsLoading(true);
    try {
      console.log('🔄 Loading initial data...');
      
      // Get today's date for filtering
      const today = new Date().toISOString().split('T')[0];
      
      const [
        casesResponse,
        theatresResponse,
        sessionsResponse,
        consultantsResponse,
        anaesthetistsResponse,
        statisticsResponse
      ] = await Promise.all([
        apiClient.getCases({ archived: false }),
        apiClient.getTheatres(),
        apiClient.getSessions({ session_date: today }), // Only today's sessions
        apiClient.getConsultants(),
        apiClient.getAnaesthetists(),
        apiClient.getCaseStatistics()
      ]);

      setCases(casesResponse.items);
      setTheatres(theatresResponse);
      setSessions(sessionsResponse);
      setConsultants(consultantsResponse);
      setAnaesthetists(anaesthetistsResponse);
      setCaseStatistics(statisticsResponse);
      
      setIsInitialized(true);
      isDataProviderInitialized = true;
      

      
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
    } finally {
      setIsLoading(false);
      isDataLoading = false;
      isCriticalState.current = false;
    }
  };

  // Refresh methods
  const refreshCases = async () => {
    try {
      const response = await apiClient.getCases({ archived: false });
      setCases(response.items);
    } catch (error) {
      console.error('Error refreshing cases:', error);
    }
  };

  const refreshTheatres = async () => {
    try {
      const response = await apiClient.getTheatres();
      setTheatres(response);
    } catch (error) {
      console.error('Error refreshing theatres:', error);
    }
  };

  const refreshSessions = async () => {
    try {
      const response = await apiClient.getSessions();
      setSessions(response);
    } catch (error) {
      console.error('Error refreshing sessions:', error);
    }
  };

  const refreshConsultants = async () => {
    try {
      const response = await apiClient.getConsultants();
      setConsultants(response);
    } catch (error) {
      console.error('Error refreshing consultants:', error);
    }
  };

  const refreshAnaesthetists = async () => {
    try {
      const response = await apiClient.getAnaesthetists();
      setAnaesthetists(response);
    } catch (error) {
      console.error('Error refreshing anaesthetists:', error);
    }
  };

  const refreshCaseStatistics = async () => {
    try {
      const response = await apiClient.getCaseStatistics();
      setCaseStatistics(response);
    } catch (error) {
      console.error('Error refreshing case statistics:', error);
    }
  };

  // Data manipulation methods
  const addCase = (caseData: Case) => {
    console.log(`🔌 Adding case: ${caseData.id} - ${caseData.name} (status: ${caseData.status})`);
    console.log(`🔌 Current cases count: ${cases.length}`);
    
    setCases(prev => {
      // Check if case already exists to prevent duplicates
      const existingCase = prev.find(c => c.id === caseData.id);
      if (existingCase) {
        console.log(`🔄 Case ${caseData.id} already exists, updating instead of adding`);
        // Update existing case instead of adding duplicate
        const newCases = prev.map(c => c.id === caseData.id ? { ...c, ...caseData } : c);
        return newCases;
      }
      
      console.log(`✅ Adding new case: ${caseData.id}`);
      const newCases = [...prev, caseData];
      console.log(`✅ New cases array length: ${newCases.length}`);
      console.log(`✅ New cases array:`, newCases.map(c => `${c.id} - ${c.name} (${c.status})`));
      
      return newCases;
    });
  };

  const updateCase = (caseId: string, updates: Partial<Case>) => {
    console.log(`🔄 Updating case: ${caseId} with updates:`, updates);
    
    setCases(prev => {
      const newCases = prev.map(c => c.id === caseId ? { ...c, ...updates } : c);
      return newCases;
    });
  };

  const deleteCase = (caseId: string) => {
    console.log(`🗑️ Deleting case: ${caseId}`);
    console.log(`🗑️ Current cases count before deletion: ${cases.length}`);
    
    setCases(prev => {
      const newCases = prev.filter(c => c.id !== caseId);
      console.log(`🗑️ Cases count after deletion: ${newCases.length}`);
      
      return newCases;
    });
  };

  const addTheatre = (theatreData: Theatre) => {
    setTheatres(prev => {
      const newTheatres = [...prev, theatreData];
      return newTheatres;
    });
  };

  const updateTheatre = (theatreId: string, updates: Partial<Theatre>) => {
    setTheatres(prev => {
      const newTheatres = prev.map(t => t.id === theatreId ? { ...t, ...updates } : t);
      return newTheatres;
    });
  };

  const deleteTheatre = (theatreId: string) => {
    setTheatres(prev => {
      const newTheatres = prev.filter(t => t.id !== theatreId);
      return newTheatres;
    });
  };

  const addSession = (sessionData: TheatreSession) => {
    setSessions(prev => {
      const newSessions = [...prev, sessionData];
      return newSessions;
    });
  };

  const updateSession = (sessionId: string, updates: Partial<TheatreSession>) => {
    setSessions(prev => {
      const newSessions = prev.map(s => s.id === sessionId ? { ...s, ...updates } : s);
      return newSessions;
    });
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      return newSessions;
    });
  };

  // Load data on mount
  useEffect(() => {
    console.log(`🔌 DataProvider ${providerId} mounted`);
    loadInitialData();
    
    return () => {
      console.log(`🔌 DataProvider ${providerId} unmounted`);
    };
  }, [providerId]);

  const value: DataContextType = {
    // Data
    cases,
    theatres,
    sessions,
    consultants,
    anaesthetists,
    caseStatistics,
    
    // Loading states
    isLoading,
    isInitialized,
    
    // Actions
    refreshCases,
    refreshTheatres,
    refreshSessions,
    refreshConsultants,
    refreshAnaesthetists,
    refreshCaseStatistics,
    
    // Data manipulation
    addCase,
    updateCase,
    deleteCase,
    addTheatre,
    updateTheatre,
    deleteTheatre,
    addSession,
    updateSession,
    deleteSession,
  };

  // Don't render children until data is loaded
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
