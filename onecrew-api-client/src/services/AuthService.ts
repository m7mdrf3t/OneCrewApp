import * as SecureStore from 'expo-secure-store';
import { ApiClient } from '../core/ApiClient';
import { 
  LoginRequest, 
  SignupRequest, 
  AuthResponse, 
  User, 
  ApiResponse 
} from '../types';

const TOKEN_KEY = 'onecrew_auth_token';
const USER_KEY = 'onecrew_user_data';

export class AuthService {
  private apiClient: ApiClient;
  private currentUser: User | null = null;
  private authToken: string | null = null;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  // Initialize auth state from secure storage
  async initialize(): Promise<void> {
    try {
      const [token, userData] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY)
      ]);

      if (token && userData) {
        this.authToken = token;
        this.currentUser = JSON.parse(userData);
        this.apiClient.setAuthToken(token);
      }
    } catch (error) {
      console.warn('Failed to initialize auth state:', error);
    }
  }

  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/api/auth/signin', credentials);
      
      if (response.success && response.data) {
        await this.setAuthData(response.data);
        return response.data;
      }
      
      throw new Error(response.error || 'Login failed');
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Signup
  async signup(userData: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/api/auth/signup', userData);
      
      if (response.success && response.data) {
        await this.setAuthData(response.data);
        return response.data;
      }
      
      throw new Error(response.error || 'Signup failed');
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      console.log('🚪 AuthService: Starting logout process...');
      // Call logout endpoint if user is authenticated
      if (this.isAuthenticated()) {
        console.log('🚪 AuthService: User is authenticated, calling signout endpoint...');
        await this.apiClient.post('/api/auth/signout');
        console.log('✅ AuthService: Signout endpoint called successfully');
      } else {
        console.log('ℹ️ AuthService: User not authenticated, skipping signout call');
      }
    } catch (error) {
      console.warn('❌ AuthService: Logout request failed:', error);
    } finally {
      console.log('🧹 AuthService: Clearing auth data...');
      await this.clearAuthData();
      console.log('✅ AuthService: Auth data cleared');
    }
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await this.apiClient.post<AuthResponse>('/api/auth/refresh');
      
      if (response.success && response.data) {
        await this.setAuthData(response.data);
        return response.data;
      }
      
      throw new Error(response.error || 'Token refresh failed');
    } catch (error) {
      // If refresh fails, clear auth data
      await this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!(this.authToken && this.currentUser);
  }

  // Get auth token
  getAuthToken(): string | null {
    return this.authToken;
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await this.apiClient.put<{ user: User }>('/api/users/profile', updates);
      
      if (response.success && response.data) {
        this.currentUser = response.data.user;
        await this.saveUserData(this.currentUser);
        return response.data.user;
      }
      
      throw new Error(response.error || 'Profile update failed');
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await this.apiClient.put('/api/users/change-password', {
        currentPassword,
        newPassword
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Password change failed');
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await this.apiClient.post('/api/auth/forgot-password', { email });
      
      if (!response.success) {
        throw new Error(response.error || 'Password reset request failed');
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await this.apiClient.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Password reset failed');
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Private methods
  private async setAuthData(authData: AuthResponse): Promise<void> {
    this.authToken = authData.token;
    this.currentUser = authData.user;
    this.apiClient.setAuthToken(authData.token);
    
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, authData.token),
      this.saveUserData(authData.user)
    ]);
  }

  private async clearAuthData(): Promise<void> {
    console.log('🧹 AuthService: Clearing auth data...');
    this.authToken = null;
    this.currentUser = null;
    this.apiClient.removeAuthToken();
    console.log('🧹 AuthService: Local auth data cleared');
    
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY)
      ]);
      console.log('🧹 AuthService: Secure storage cleared');
    } catch (error) {
      console.warn('❌ AuthService: Failed to clear auth data from storage:', error);
    }
  }

  private async saveUserData(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to save user data:', error);
    }
  }

  private handleAuthError(error: any): Error {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      this.clearAuthData();
      return new Error('Session expired. Please login again.');
    }
    
    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      return new Error('You do not have permission to perform this action.');
    }
    
    if (error.message?.includes('Network')) {
      return new Error('Network error. Please check your connection.');
    }
    
    return error instanceof Error ? error : new Error('Authentication failed');
  }
}
