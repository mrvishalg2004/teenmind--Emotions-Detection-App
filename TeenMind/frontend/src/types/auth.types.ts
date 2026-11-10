export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent';
  studentId?: string;
  linkedStudentId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'parent';
  linkedStudentId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

export type StudentStackParamList = {
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
  Questionnaire: undefined;
  MoodTracker: undefined;
  Journal: undefined;
  Chatbot: undefined;
};

export type ParentStackParamList = {
  ParentDashboard: undefined;
  ChildOverview: undefined;
  Reports: undefined;
  Settings: undefined;
};

// Mental Health Types (for future use)
export interface MoodEntry {
  id: string;
  studentId: string;
  mood: number; // 1-10 scale
  energy?: number;
  stress?: number;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface QuestionnaireResponse {
  id: string;
  studentId: string;
  questionId: string;
  answer: string | number | boolean;
  completedAt: string;
}