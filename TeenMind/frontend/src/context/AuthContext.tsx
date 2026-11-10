import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthService } from '../services/auth.service';
import { User, LoginData, RegisterData, AuthContextType } from '../types/auth.types';
import { Alert } from 'react-native';

// Auth state interface
interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

// Initial state
const initialState: AuthState = {
  user: null,
  loading: true,
  initialized: false,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };

    case 'SET_INITIALIZED':
      return { ...state, initialized: action.payload };

    case 'UPDATE_USER':
      return { ...state, user: action.payload };

    case 'LOGOUT':
      return { ...state, user: null, loading: false };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check if user is authenticated
      const isAuth = await AuthService.isAuthenticated();

      if (isAuth) {
        // Try to refresh user data from server
        const user = await AuthService.refreshUserData();

        if (user) {
          dispatch({ type: 'SET_USER', payload: user });
        } else {
          // If refresh fails, user needs to login again
          dispatch({ type: 'SET_USER', payload: null });
        }
      } else {
        dispatch({ type: 'SET_USER', payload: null });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: 'SET_USER', payload: null });
    } finally {
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    }
  };

  const login = async (data: LoginData): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await AuthService.login(data);

      if (response.success && response.user) {
        dispatch({ type: 'SET_USER', payload: response.user });

        // Show success message
        Alert.alert('Success', `Welcome back, ${response.user.name}!`);
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });

      // Show error message
      const errorMessage = error?.message || 'Login failed. Please try again.';
      Alert.alert('Login Error', errorMessage);

      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const response = await AuthService.register(data);

      if (response.success && response.user) {
        dispatch({ type: 'SET_USER', payload: response.user });

        // Show success message
        const roleMessage = response.user.role === 'student'
          ? 'Your account has been created successfully!'
          : 'Your parent account has been created and linked successfully!';

        Alert.alert('Welcome to TeenMind', roleMessage);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });

      // Show error message with specific details
      let errorMessage = 'Registration failed. Please try again.';

      if (error?.errors && Array.isArray(error.errors)) {
        errorMessage = error.errors.map((err: any) => err.message).join('\n');
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert('Registration Error', errorMessage);

      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      await AuthService.logout();

      dispatch({ type: 'LOGOUT' });

      Alert.alert('Goodbye', 'You have been logged out successfully.');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    try {
      const updatedUser = await AuthService.updateProfile(userData);
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Update profile error:', error);

      const errorMessage = error?.message || 'Failed to update profile.';
      Alert.alert('Update Error', errorMessage);

      throw error;
    }
  };

  // Helper function to check if user is authenticated
  const isAuthenticated = !!state.user && state.initialized;

  // Context value
  const value: AuthContextType = {
    user: state.user,
    loading: state.loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// HOC for protected components
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      // You can return a loading component here
      return null;
    }

    if (!isAuthenticated) {
      // You can return a login prompt here
      return null;
    }

    return <Component {...props} />;
  };
}

// HOC for guest-only components (login/register screens)
export function withGuest<P extends object>(Component: React.ComponentType<P>) {
  return function GuestComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      // You can return a loading component here
      return null;
    }

    if (isAuthenticated) {
      // User is already authenticated, redirect to main app
      return null;
    }

    return <Component {...props} />;
  };
}