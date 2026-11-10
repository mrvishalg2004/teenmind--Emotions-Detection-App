import { apiClient, ApiError } from './api';
import { StorageService } from './storage.service';
import { User, LoginData, RegisterData, AuthResponse } from '../types/auth.types';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);

      // Store token and user data
      if (response.success && response.token && response.user) {
        await Promise.all([
          StorageService.setToken(response.token),
          StorageService.setUser(response.user),
        ]);
      }

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);

      // Store token and user data
      if (response.success && response.token && response.user) {
        await Promise.all([
          StorageService.setToken(response.token),
          StorageService.setUser(response.user),
        ]);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint (optional, for server-side logging)
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API fails
    } finally {
      // Always clear local data
      await StorageService.clearAll();
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');

      if (response.success && response.user) {
        // Update stored user data
        await StorageService.setUser(response.user);
        return response.user;
      }

      throw new Error('Failed to get user profile');
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<{ success: boolean; user: User; message: string }>('/auth/profile', data);

      if (response.success && response.user) {
        // Update stored user data
        await StorageService.setUser(response.user);
        return response.user;
      }

      throw new Error('Failed to update profile');
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await apiClient.put<{ success: boolean; message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });

      if (!response.success) {
        throw new Error('Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Verify student ID (for parent registration)
   */
  static async verifyStudentId(studentId: string): Promise<{ success: boolean; student?: { name: string; studentId: string } }> {
    try {
      const response = await apiClient.get<{ success: boolean; student: { name: string; studentId: string } }>(`/auth/verify-student-id/${studentId}`);
      return response;
    } catch (error) {
      console.error('Verify student ID error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated (has valid token and user data)
   */
  static async isAuthenticated(): Promise<boolean> {
    return await StorageService.isAuthenticated();
  }

  /**
   * Get stored user data
   */
  static async getStoredUser(): Promise<User | null> {
    return await StorageService.getUser();
  }

  /**
   * Get stored token
   */
  static async getStoredToken(): Promise<string | null> {
    return await StorageService.getToken();
  }

  /**
   * Refresh user data from server
   */
  static async refreshUserData(): Promise<User | null> {
    try {
      const isAuth = await AuthService.isAuthenticated();
      if (!isAuth) {
        return null;
      }

      const user = await AuthService.getCurrentUser();
      return user;
    } catch (error) {
      console.error('Refresh user data error:', error);
      // If refresh fails, clear stored data
      await StorageService.clearAll();
      return null;
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(role: 'student' | 'parent'): Promise<boolean> {
    const user = await StorageService.getUser();
    return user?.role === role;
  }
}