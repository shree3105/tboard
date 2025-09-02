import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  Case, 
  CreateCaseRequest, 
  UpdateCaseRequest, 
  CasesFilters, 
  SearchRequest, 
  BulkUpdateRequest,
  LoginResponse,
  TokenResponse,
  UserCreate,
  UserLogin,
  User,
  UserSimple,
  UserRole,
  Theatre,
  TheatreCreate,
  TheatreUpdate,
  TheatreSession,
  TheatreSessionCreate,
  TheatreSessionUpdate,
  CaseSchedule,
  CaseScheduleCreate,
  CaseScheduleUpdate,
  CaseStatisticsResponse,
  SubspecialtyStatisticsResponse,
  ConsultantWorkloadResponse,
  TheatreUtilizationResponse,
  TrendsResponse,
  SystemStatsResponse,
  DashboardStats,
  PaginatedResponse,
  WebSocketSubscription,
  WebSocketMessage,
  CalendarSlot,
  CalendarDay,
  ExportOptions,
  AuditLog,
  Notification,
  DepartmentSetting,
  DepartmentSettingUpdate,
  HealthResponse,
  RootResponse,
  WebSocketStatusResponse,
  ApiStatsResponse,
  CalendarDateResponse,
  ReorderRequest,
  ReorderResponse,
  NextOrderIndexResponse,
  BulkUpdateResponse,
  SuccessResponse,
  SearchResponse
} from './types';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://trauma-board-api.onrender.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token or session
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // For session-based auth, we might need to include credentials
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or session invalid, redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API client with all endpoints
const apiClient = {
  // Authentication
  login: async (credentials: UserLogin): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  loginWithUser: async (credentials: UserLogin): Promise<TokenResponse> => {
    const response = await api.post('/auth/login-with-user', credentials);
    return response.data;
  },

  register: async (userData: UserCreate): Promise<User> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  refreshToken: async (): Promise<TokenResponse> => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  // Health and system
  health: async (): Promise<HealthResponse> => {
    const response = await api.get('/health');
    return response.data;
  },

  root: async (): Promise<RootResponse> => {
    const response = await api.get('/');
    return response.data;
  },

  // Cases
  createCase: async (caseData: CreateCaseRequest): Promise<Case> => {
    const response = await api.post('/cases/', caseData);
    return response.data;
  },

  getCases: async (filters?: CasesFilters): Promise<PaginatedResponse<Case>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/cases/?${params.toString()}`);
    return response.data;
  },

  getCase: async (caseId: string): Promise<Case> => {
    const response = await api.get(`/cases/${caseId}`);
    return response.data;
  },

  updateCase: async (caseId: string, caseData: UpdateCaseRequest): Promise<Case> => {
    const response = await api.patch(`/cases/${caseId}`, caseData);
    return response.data;
  },

  deleteCase: async (caseId: string): Promise<SuccessResponse> => {
    const response = await api.delete(`/cases/${caseId}`);
    return response.data;
  },

  searchCases: async (searchRequest: SearchRequest): Promise<SearchResponse> => {
    const response = await api.post('/cases/search', searchRequest);
    return response.data;
  },

  bulkUpdateCases: async (bulkRequest: BulkUpdateRequest): Promise<BulkUpdateResponse> => {
    const response = await api.post('/cases/bulk', bulkRequest);
    return response.data;
  },

  reorderCases: async (reorderRequest: ReorderRequest): Promise<ReorderResponse> => {
    const response = await api.post('/cases/reorder', reorderRequest);
    return response.data;
  },

  archiveCase: async (caseId: string): Promise<SuccessResponse> => {
    const response = await api.post(`/cases/${caseId}/archive`);
    return response.data;
  },

  unarchiveCase: async (caseId: string): Promise<SuccessResponse> => {
    const response = await api.post(`/cases/${caseId}/unarchive`);
    return response.data;
  },

  getCalendarCases: async (dateStr: string): Promise<CalendarDateResponse[]> => {
    const response = await api.get(`/cases/calendar/${dateStr}`);
    return response.data;
  },

  getNextOrderIndex: async (theatreId: string, surgeryDate: string): Promise<NextOrderIndexResponse> => {
    const response = await api.get(`/cases/next-order-index/${theatreId}?surgery_date=${surgeryDate}`);
    return response.data;
  },

  // Theatres
  getTheatres: async (): Promise<Theatre[]> => {
    const response = await api.get('/theatres/');
    return response.data;
  },

  createTheatre: async (theatreData: TheatreCreate): Promise<Theatre> => {
    const response = await api.post('/theatres/', theatreData);
    return response.data;
  },

  getTheatre: async (theatreId: string): Promise<Theatre> => {
    const response = await api.get(`/theatres/${theatreId}`);
    return response.data;
  },

  updateTheatre: async (theatreId: string, theatreData: TheatreUpdate): Promise<Theatre> => {
    const response = await api.patch(`/theatres/${theatreId}`, theatreData);
    return response.data;
  },

  deleteTheatre: async (theatreId: string): Promise<SuccessResponse> => {
    const response = await api.delete(`/theatres/${theatreId}`);
    return response.data;
  },

  // Theatre Sessions
  getSessions: async (filters?: {
    theatre_id?: string;
    session_date?: string;
    session_type?: string;
  }): Promise<TheatreSession[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/sessions/?${params.toString()}`);
    return response.data;
  },

  createSession: async (sessionData: TheatreSessionCreate): Promise<TheatreSession> => {
    const response = await api.post('/sessions/', sessionData);
    return response.data;
  },

  getSession: async (sessionId: string): Promise<TheatreSession> => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  updateSession: async (sessionId: string, sessionData: TheatreSessionUpdate): Promise<TheatreSession> => {
    const response = await api.patch(`/sessions/${sessionId}`, sessionData);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<SuccessResponse> => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  // Case Schedules
  getSchedules: async (filters?: {
    case_id?: string;
    session_id?: string;
    theatre_id?: string;
    schedule_date?: string;
  }): Promise<CaseSchedule[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/schedules/?${params.toString()}`);
    return response.data;
  },

  createSchedule: async (scheduleData: CaseScheduleCreate): Promise<CaseSchedule> => {
    const response = await api.post('/schedules/', scheduleData);
    return response.data;
  },

  getSchedule: async (scheduleId: string): Promise<CaseSchedule> => {
    const response = await api.get(`/schedules/${scheduleId}`);
    return response.data;
  },

  updateSchedule: async (scheduleId: string, scheduleData: CaseScheduleUpdate): Promise<CaseSchedule> => {
    const response = await api.patch(`/schedules/${scheduleId}`, scheduleData);
    return response.data;
  },

  deleteSchedule: async (scheduleId: string): Promise<SuccessResponse> => {
    const response = await api.delete(`/schedules/${scheduleId}`);
    return response.data;
  },

  reorderSchedules: async (scheduleIds: string[]): Promise<SuccessResponse> => {
    const response = await api.post('/schedules/reorder', scheduleIds.map((scheduleId, index) => ({
      schedule_id: scheduleId,
      order_index: index + 1
    })));
    return response.data;
  },

  // Admin endpoints
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  // Consultant and Anaesthetist endpoints
  getConsultants: async (): Promise<UserSimple[]> => {
    const response = await api.get('/auth/consultants');
    return response.data;
  },

  getAnaesthetists: async (): Promise<UserSimple[]> => {
    const response = await api.get('/auth/anaesthetists');
    return response.data;
  },

  getUsersByRole: async (role: string): Promise<UserSimple[]> => {
    const response = await api.get(`/auth/by-role/${role}`);
    return response.data;
  },

  createUser: async (userData: UserCreate): Promise<User> => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (userId: string, userData: any): Promise<User> => {
    const response = await api.patch(`/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: string): Promise<SuccessResponse> => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  getDepartmentSettings: async (): Promise<DepartmentSetting> => {
    const response = await api.get('/admin/department-settings');
    return response.data;
  },

  updateDepartmentSettings: async (settingsData: DepartmentSettingUpdate): Promise<DepartmentSetting> => {
    const response = await api.patch('/admin/department-settings', settingsData);
    return response.data;
  },

  getSystemStats: async (): Promise<SystemStatsResponse> => {
    const response = await api.get('/admin/system-stats');
    return response.data;
  },

  // Analytics
  getCaseStatistics: async (filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<CaseStatisticsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/analytics/case-statistics?${params.toString()}`);
    return response.data;
  },

  getSubspecialtyStatistics: async (filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<SubspecialtyStatisticsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/analytics/subspecialty-statistics?${params.toString()}`);
    return response.data;
  },

  getConsultantWorkload: async (filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ConsultantWorkloadResponse[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/analytics/consultant-workload?${params.toString()}`);
    return response.data;
  },

  getTheatreUtilization: async (filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<TheatreUtilizationResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/analytics/theatre-utilization?${params.toString()}`);
    return response.data;
  },

  getTrends: async (filters?: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TrendsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/analytics/trends?${params.toString()}`);
    return response.data;
  },

  // WebSocket
  getWebSocketStatus: async (): Promise<WebSocketStatusResponse> => {
    const response = await api.get('/ws/status');
    return response.data;
  },

  getWebSocketHealth: async (): Promise<HealthResponse> => {
    const response = await api.get('/ws/health');
    return response.data;
  },

  // API Stats
  getApiStats: async (): Promise<ApiStatsResponse> => {
    const response = await api.get('/api/stats');
    return response.data;
  },

  // Utility methods
  setAuthToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  },

  getAuthToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  removeAuthToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
  },

  setUser: (user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      // For session-based auth, we might only need the user
      return !!(token || user);
    }
    return false;
  },

  hasRole: (requiredRole: UserRole): boolean => {
    if (typeof window !== 'undefined') {
      const user = apiClient.getUser();
      if (!user) return false;
      
      const roleHierarchy: Record<UserRole, number> = {
        'viewer': 1,
        'nurse': 2,
        'anaesthetist': 3,
        'consultant': 4,
        'admin': 5
      };
      
      return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    }
    return false;
  },

  // Admin endpoints
  admin: {
    // User Management
    getUsers: async (params?: {
      skip?: number;
      limit?: number;
      role?: string;
      department?: string;
      is_active?: boolean;
    }): Promise<User[]> => {
      const searchParams = new URLSearchParams();
      if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
      if (params?.role) searchParams.append('role', params.role);
      if (params?.department) searchParams.append('department', params.department);
      if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
      
      const response = await api.get(`/admin/users?${searchParams.toString()}`);
      return response.data;
    },

    createUser: async (userData: {
      email: string;
      first_name: string;
      last_name: string;
      department?: string;
      role: string;
      password: string;
      is_active?: boolean;
    }): Promise<User> => {
      const response = await api.post('/admin/users', userData);
      return response.data;
    },

    updateUser: async (userId: string, updates: {
      first_name?: string;
      last_name?: string;
      email?: string;
      role?: string;
      department?: string;
      is_active?: boolean;
    }): Promise<User> => {
      const response = await api.patch(`/admin/users/${userId}`, updates);
      return response.data;
    },

    deactivateUser: async (userId: string): Promise<{ message: string }> => {
      const response = await api.post(`/admin/users/${userId}/deactivate`);
      return response.data;
    },

    activateUser: async (userId: string): Promise<{ message: string }> => {
      const response = await api.post(`/admin/users/${userId}/activate`);
      return response.data;
    },

    resetUserPassword: async (userId: string, newPassword: string): Promise<{ message: string }> => {
      const response = await api.post(`/admin/users/${userId}/reset-password`, {
        new_password: newPassword
      });
      return response.data;
    },

    deleteUser: async (userId: string): Promise<{ message: string }> => {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    },

    getUserStatistics: async (): Promise<{
      total_users: number;
      active_users: number;
      inactive_users: number;
      admins: number;
      consultants: number;
      nurses: number;
      viewers: number;
      anaesthetists: number;
    }> => {
      const response = await api.get('/admin/users/statistics');
      return response.data;
    },

    // Session Templates
    getSessionTemplates: async (isWeekend?: boolean): Promise<Array<{
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
    }>> => {
      const params = isWeekend !== undefined ? `?is_weekend=${isWeekend}` : '';
      const response = await api.get(`/admin/session-templates${params}`);
      return response.data;
    },

    createSessionTemplate: async (template: {
      theatre_id: string;
      start_time: string;
      end_time: string;
      session_type: string;
      consultant_id?: string;
      anaesthetist_id?: string;
      notes?: string;
      is_weekend_template?: boolean;
    }): Promise<{ message: string }> => {
      const response = await api.post('/admin/session-templates', template);
      return response.data;
    },

    updateSessionTemplate: async (templateId: string, updates: {
      theatre_id?: string;
      start_time?: string;
      end_time?: string;
      session_type?: string;
      consultant_id?: string;
      anaesthetist_id?: string;
      notes?: string;
      is_weekend_template?: boolean;
    }): Promise<{ message: string }> => {
      const response = await api.patch(`/admin/session-templates/${templateId}`, updates);
      return response.data;
    },

    deleteSessionTemplate: async (templateId: string): Promise<{ message: string }> => {
      const response = await api.delete(`/admin/session-templates/${templateId}`);
      return response.data;
    },

    initializeSessions: async (date: string, theatreId?: string): Promise<{ message: string }> => {
      const url = `/admin/initialize-sessions/${date}${theatreId ? `?theatre_id=${theatreId}` : ''}`;
      const response = await api.post(url);
      return response.data;
    },

    // System Statistics
    getSystemStats: async (): Promise<{
      total_cases: {
        total_cases: number;
        new_referrals: number;
        awaiting_surgery: number;
        scheduled_cases: number;
        completed_cases: number;
        archived_cases: number;
      };
      subspecialty_stats: Record<string, number>;
      consultant_workload: Array<{
        consultant_name: string;
        first_name: string;
        last_name: string;
        total_cases: number;
        case_count: number;
      }>;
      websocket_connections: number;
      active_users: number;
    }> => {
      const response = await api.get('/admin/system-stats');
      return response.data;
    }
  },

  // ICD Codes
  getICDCodes: async (query?: string, limit: number = 100): Promise<Array<{
    id: number;
    sub_code: string;
    label: string;
    is_trauma: boolean;
  }>> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (limit) params.append('limit', limit.toString());
    
    const response = await api.get(`/icd-codes/trauma?${params.toString()}`);
    return response.data;
  }
};

export default apiClient;
