import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../../services/authService';
import type {
  User, Student, Parent,
  LoginCredentials, RegisterData
} from '../../types/mentalHealth';

// ─── Context Types ─────────────────────────────────────────────────────────
export interface AuthContextType {
  // State
  user: User | null;
  roleData: Student | Parent | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (updates: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
}

// ─── Context Creation ────────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ─── Auth Provider Component ─────────────────────────────────────────────────
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [roleData, setRoleData] = useState<Student | Parent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Computed Values ──────────────────────────────────────────────────────
  const isAuthenticated = !!user;

  // ── Load User on Mount ────────────────────────────────────────────────────
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      const userData = await AuthService.getCurrentUser();

      if (userData) {
        setUser(userData.user);
        setRoleData(userData.roleData || null);
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setLoading(true);

      const response = await AuthService.login(credentials);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Login failed');
      }

      setUser(response.data.user);
      setRoleData(response.data.roleData || null);

    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Register ────────────────────────────────────────────────────────────
  const register = useCallback(async (data: RegisterData) => {
    try {
      setError(null);
      setLoading(true);

      const response = await AuthService.register(data);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Registration failed');
      }

      setUser(response.data.user);
      setRoleData(response.data.roleData || null);

    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setRoleData(null);
      setError(null);
    }
  }, []);

  // ── Refresh User ────────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const userData = await AuthService.getCurrentUser();
      if (userData) {
        setUser(userData.user);
        setRoleData(userData.roleData || null);
      } else {
        // Token invalid - logout
        setUser(null);
        setRoleData(null);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  }, []);

  // ── Update Profile ──────────────────────────────────────────────────────
  const updateProfile = useCallback(async (updates: Record<string, unknown>) => {
    try {
      setError(null);
      const response = await AuthService.updateProfile(updates);

      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    }
  }, []);

  // ── Clear Error ─────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ── Context Value ────────────────────────────────────────────────────────
  const contextValue: AuthContextType = {
    user,
    roleData,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function getErrorMessage(err: unknown): string {
  // Check for Axios error FIRST (Axios errors also extend Error, so check response data first)
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err
  ) {
    const axiosError = err as {
      response?: { data?: { message?: string; errors?: { message: string }[] } };
      message?: string;
    };
    // Use server's message if available, otherwise fall back to axios message
    return (
      axiosError.response?.data?.message ||
      axiosError.message ||
      'An unexpected error occurred'
    );
  }

  if (err instanceof Error) {
    return err.message;
  }

  return 'An unexpected error occurred';
}