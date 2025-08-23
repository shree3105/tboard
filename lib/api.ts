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
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
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
    console.log('API getCases URL:', url);
    console.log('API getCases filters:', filters);
    
    const response = await api.get(url);
    console.log('API getCases response:', response.data);
    return response.data;
  },

  createCase: async (caseData: CreateCaseRequest): Promise<Case> => {
    const response = await api.post('/cases/', caseData);
    return response.data;
  },

  updateCase: async (caseId: string, caseData: UpdateCaseRequest): Promise<Case> => {
    const response = await api.patch(`/cases/${caseId}`, caseData);
    return response.data;
  },

  deleteCase: async (caseId: string): Promise<void> => {
    await api.delete(`/cases/${caseId}`);
  },
};

export default api;
