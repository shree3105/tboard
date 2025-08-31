import axios from 'axios';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  User, 
  Case, 
  CreateCaseRequest, 
  UpdateCaseRequest, 
  CasesFilters 
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://trauma-board-api.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Enable credentials for CORS
  withCredentials: false,
  // Add timeout for security
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // console.log('Adding auth token to request:', config.url);
    } else {
      console.warn('No auth token found for request:', config.url);
    }
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error handling with detailed logging
    console.error('API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      requestData: error.config?.data
    });
    
    if (error.response?.status === 401) {
      console.warn('Authentication failed - redirecting to login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      console.error('Access forbidden - insufficient permissions');
    } else if (error.response?.status === 422) {
      console.error('Validation error - check request data format');
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status);
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/users/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<User> => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },
};

export const casesAPI = {
  getCases: async (filters?: CasesFilters): Promise<Case[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Handle boolean values properly
          if (typeof value === 'boolean') {
            params.append(key, value ? 'true' : 'false');
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    
    const url = `/cases/?${params.toString()}`;
          // console.log('Getting cases with URL:', url);
      const response = await api.get(url);
      // console.log('Get cases response:', response);
      // console.log('Get cases data:', response.data);
    
    // Handle different response structures
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.items)) {
      return response.data.items;
    } else if (response.data && Array.isArray(response.data.cases)) {
      return response.data.cases;
    } else {
      console.warn('Unexpected response structure:', response.data);
      return [];
    }
  },

  // New refresh endpoint for initial data loading
  refreshCases: async (): Promise<Case[]> => {
    const response = await api.get('/cases/refresh');
          // console.log('Refresh cases response:', response);
      // console.log('Refresh cases data:', response.data);
    
    // Handle different response structures
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.items)) {
      return response.data.items;
    } else if (response.data && Array.isArray(response.data.cases)) {
      return response.data.cases;
    } else {
      console.warn('Unexpected refresh response structure:', response.data);
      return [];
    }
  },

  getCalendarCases: async (weekStart: string, weekEnd: string): Promise<Case[]> => {
    const response = await api.get(`/cases/calendar/${weekStart}/${weekEnd}`);
          // console.log('Calendar cases response:', response);
      // console.log('Calendar cases data:', response.data);
    
    // Handle different response structures
    if (response.data && response.data.cases && Array.isArray(response.data.cases)) {
      return response.data.cases;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('Unexpected calendar response structure:', response.data);
      return [];
    }
  },

  createCase: async (caseData: CreateCaseRequest): Promise<Case> => {
    const response = await api.post('/cases/', caseData);
    return response.data;
  },

  updateCase: async (caseId: string, caseData: UpdateCaseRequest): Promise<Case> => {
    // console.log('API updateCase called with:', { caseId, caseData });
    const response = await api.patch(`/cases/${caseId}`, caseData);
    return response.data;
  },

  deleteCase: async (caseId: string): Promise<void> => {
    await api.delete(`/cases/${caseId}`);
  },

  // New search functionality
  searchCases: async (query: string): Promise<Case[]> => {
    const response = await api.get(`/cases/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // New audit trail functionality
  getCaseAudit: async (caseId: string): Promise<any[]> => {
    const response = await api.get(`/cases/${caseId}/audit`);
    return response.data;
  },
};

export default api;
