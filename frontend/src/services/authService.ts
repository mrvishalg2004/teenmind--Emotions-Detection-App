import api, { TokenStorage } from './api';
import type {
  User, Student, Parent,
  LoginCredentials, RegisterData, AuthResponse,
  ApiResponse
} from '../types/mentalHealth';

export interface CurrentUserResponse {
  user: User;
  roleData?: Student | Parent;
}

/**
 * Authentication service for TeenMind
 * Provides login, register, logout, and user profile management
 */
export const AuthService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);

    if (response.data.success && response.data.data) {
      const { token, refreshToken } = response.data.data;

      // Store tokens securely
      await TokenStorage.setToken(token);
      if (refreshToken) {
        await TokenStorage.setRefreshToken(refreshToken);
      }
    }

    return response.data;
  },

  /**
   * Register a new user (student or parent)
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);

    if (response.data.success && response.data.data) {
      const { token, refreshToken } = response.data.data;

      // Store tokens securely
      await TokenStorage.setToken(token);
      if (refreshToken) {
        await TokenStorage.setRefreshToken(refreshToken);
      }
    }

    return response.data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Notify server of logout
      await api.post('/auth/logout');
    } catch (error: unknown) {
      // Even if server request fails, clear local tokens
      const status =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: number } }).response?.status === 'number'
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      // 401 during logout is expected when token is already expired/cleared.
      if (status !== 401) {
        console.warn('Server logout request failed; cleared local session anyway.');
      }
    } finally {
      // Always clear local storage
      await TokenStorage.clearAll();
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<CurrentUserResponse | null> {
    try {
      const token = await TokenStorage.getToken();
      if (!token) return null;

      const response = await api.get<ApiResponse<CurrentUserResponse>>('/auth/me');

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      return null;
    } catch {
      // Clear token if request fails (might be expired)
      await TokenStorage.clearAll();
      return null;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Record<string, unknown>): Promise<ApiResponse<{ user: User }>> {
    const response = await api.put<ApiResponse<{ user: User }>>('/auth/profile', updates);
    return response.data;
  },

  /**
   * Change user password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return response.data;
  },

  /**
   * Submit parental consent for a student (parent only)
   */
  async submitParentalConsent(
    studentId: string,
    consentGiven: boolean
  ): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/parental-consent', {
      studentId,
      consentGiven,
    });
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await TokenStorage.getToken();
    return !!token;
  },

  /**
   * Get stored token
   */
  async getToken(): Promise<string | null> {
    return TokenStorage.getToken();
  }
};