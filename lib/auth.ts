import apiClient from './api';
import { User, UserLogin, UserCreate, LoginResponse, TokenResponse, UserRole } from './types';

class AuthService {
  private user: User | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  async login(credentials: UserLogin): Promise<User> {
    try {
      // Use the login-with-user endpoint to get both token and user info
      const response: TokenResponse = await apiClient.loginWithUser(credentials);
      console.log('Auth service login response:', response); // Debug log
      
      // Store token and user data
      apiClient.setAuthToken(response.access_token);
      apiClient.setUser(response.user);
      this.user = response.user;
      
      // Set up token refresh
      this.setupTokenRefresh();
      
      return response.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(userData: UserCreate): Promise<User> {
    try {
      const response: User = await apiClient.register(userData);
      console.log('Auth service register response:', response); // Debug log
      
      // For registration, we don't get a token, so we need to login after registration
      // Store user data but don't set up token refresh yet
      apiClient.setUser(response);
      this.user = response;
      
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const response: TokenResponse = await apiClient.refreshToken();
      
      // Update stored token and user data
      apiClient.setAuthToken(response.access_token);
      apiClient.setUser(response.user);
      this.user = response.user;
      
      // Reset token refresh timer
      this.setupTokenRefresh();
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      throw error;
    }
  }

  logout(): void {
    // Clear stored data
    apiClient.removeAuthToken();
    this.user = null;
    
    // Clear refresh timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  getUser(): User | null {
    if (!this.user) {
      this.user = apiClient.getUser();
    }
    return this.user;
  }

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  hasRole(requiredRole: UserRole): boolean {
    return apiClient.hasRole(requiredRole);
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isConsultant(): boolean {
    return this.hasRole('consultant');
  }

  isNurse(): boolean {
    return this.hasRole('nurse');
  }

  isAnaesthetist(): boolean {
    return this.hasRole('anaesthetist');
  }

  isViewer(): boolean {
    return this.hasRole('viewer');
  }

  canEditCases(): boolean {
    return this.hasAnyRole(['admin', 'consultant', 'nurse']);
  }

  canScheduleCases(): boolean {
    return this.hasAnyRole(['admin', 'consultant']);
  }

  canManageUsers(): boolean {
    return this.isAdmin();
  }

  canViewAuditLogs(): boolean {
    return this.isAdmin();
  }

  private setupTokenRefresh(): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }
    
    // Set up refresh 5 minutes before token expires (assuming 30-minute expiry)
    const refreshTime = 25 * 60 * 1000; // 25 minutes
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshToken().catch(error => {
        console.error('Automatic token refresh failed:', error);
        this.logout();
      });
    }, refreshTime);
  }

  // Initialize auth state on app startup
  initialize(): void {
    if (typeof window !== 'undefined') {
      const user = this.getUser();
      if (user && this.isAuthenticated()) {
        this.setupTokenRefresh();
      }
    }
  }
}

export const auth = new AuthService();
export default auth;
