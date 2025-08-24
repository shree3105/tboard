import { authAPI } from './api';
import { LoginRequest, RegisterRequest } from './types';

// Token validation helper
const isValidToken = (token: string): boolean => {
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if token is not expired (basic check)
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      console.warn('Token has expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

export const auth = {
  login: async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      if (typeof window !== 'undefined' && response.access_token) {
        // Validate token before storing
        if (isValidToken(response.access_token)) {
          localStorage.setItem('access_token', response.access_token);
          // Store login timestamp for session management
          localStorage.setItem('login_timestamp', Date.now().toString());
        } else {
          throw new Error('Invalid token received from server');
        }
      }
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData: RegisterRequest) => {
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('login_timestamp');
      // Clear any other auth-related data
      sessionStorage.clear();
      window.location.href = '/login';
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token && isValidToken(token)) {
        return token;
      } else if (token) {
        // Token is invalid, clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('login_timestamp');
      }
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (!token) return false;
      
      // Check if token is valid
      if (!isValidToken(token)) {
        // Clear invalid token
        localStorage.removeItem('access_token');
        localStorage.removeItem('login_timestamp');
        return false;
      }
      
      // Optional: Check session timeout (24 hours)
      const loginTimestamp = localStorage.getItem('login_timestamp');
      if (loginTimestamp) {
        const loginTime = parseInt(loginTimestamp);
        const now = Date.now();
        const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - loginTime > sessionTimeout) {
          console.warn('Session expired');
          auth.logout();
          return false;
        }
      }
      
      return true;
    }
    return false;
  },

  // Get user info from token (if available)
  getUserInfo: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return {
            userId: payload.sub || payload.user_id,
            email: payload.email,
            exp: payload.exp
          };
        } catch (error) {
          console.error('Error parsing token payload:', error);
        }
      }
    }
    return null;
  },
};
