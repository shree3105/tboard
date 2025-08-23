import { authAPI } from './api';
import { LoginRequest, RegisterRequest } from './types';

export const auth = {
  login: async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
      }
      return response;
    } catch (error) {
      throw error;
    }
  },

  register: async (userData: RegisterRequest) => {
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('access_token');
    }
    return false;
  },
};


