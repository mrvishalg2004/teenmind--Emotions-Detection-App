import { useContext } from 'react';
import { AuthContext, AuthContextType } from '../components/auth/AuthProvider';
import type { Student, Parent } from '../types/mentalHealth';

/**
 * Custom hook to access authentication context
 * Based on P15 EventCraft useAuth pattern
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context || Object.keys(context).length === 0) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook to get the current student profile
 */
export function useStudentProfile(): Student | null {
  const { roleData, user } = useAuth();
  if (user?.role !== 'student') return null;
  return roleData as Student | null;
}

/**
 * Hook to get the current parent profile
 */
export function useParentProfile(): Parent | null {
  const { roleData, user } = useAuth();
  if (user?.role !== 'parent') return null;
  return roleData as Parent | null;
}

/**
 * Hook to check if user has a specific role
 */
export function useUserRole() {
  const { user } = useAuth();

  return {
    isStudent: user?.role === 'student',
    isParent: user?.role === 'parent',
    isCounselor: user?.role === 'counselor',
    role: user?.role || null,
  };
}

/**
 * Hook to check parental consent status for students
 */
export function useParentalConsent() {
  const { user } = useAuth();

  const parentalConsent = user?.parentalConsent;

  return {
    isRequired: parentalConsent?.isRequired ?? false,
    isGranted: parentalConsent?.consentGiven ?? false,
    needsConsent: (parentalConsent?.isRequired ?? false) && !(parentalConsent?.consentGiven ?? false),
    consentDate: parentalConsent?.consentDate,
    parentId: parentalConsent?.parentId,
  };
}

export default useAuth;