// Core mental health enums
export type UserRole = 'student' | 'parent' | 'counselor';

export type MoodEmotion =
  | 'happy' | 'sad' | 'anxious' | 'angry' | 'stressed'
  | 'neutral' | 'excited' | 'frustrated' | 'overwhelmed'
  | 'hopeful' | 'fearful';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// User types
export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePicture?: string;
}

export interface ParentalConsent {
  isRequired: boolean;
  consentGiven: boolean;
  consentDate?: string;
  parentId?: string;
}

export interface PrivacySettings {
  shareDataWithParents: boolean;
  shareEmergencyData: boolean;
  allowResearch: boolean;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  emergencyAlerts: boolean;
}

export interface User {
  _id: string;
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  profile: UserProfile;
  parentalConsent: ParentalConsent;
  privacySettings: PrivacySettings;
  notificationSettings: NotificationSettings;
  emailVerified: boolean;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

// Student types
export interface EmergencyContact {
  name: string;
  relationship: 'parent' | 'guardian' | 'sibling' | 'relative' | 'friend' | 'other';
  phone: string;
  isPrimary: boolean;
}

export interface PersonalInfo {
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'other';
  emergencyContacts: EmergencyContact[];
}

export interface AcademicInfo {
  grade?: string;
  school?: string;
  graduationYear?: number;
  gpa?: number;
}

export interface MentalHealthProfile {
  currentRiskLevel: RiskLevel;
  lastAssessmentDate?: string;
  currentTherapist?: {
    name: string;
    contactInfo: string;
    licenseNumber: string;
  };
}

export interface Student {
  _id: string;
  userId: string;
  studentId: string;
  personalInfo: PersonalInfo;
  academicInfo: AcademicInfo;
  parentIds: string[];
  mentalHealthProfile: MentalHealthProfile;
  age?: number;
  createdAt: string;
  updatedAt: string;
}

// Parent types
export interface LinkedStudent {
  studentId: Student | string;
  relationshipType: string;
  isPrimary: boolean;
  canViewReports: boolean;
  canReceiveAlerts: boolean;
  consentGiven: boolean;
}

export interface Parent {
  _id: string;
  userId: string;
  parentInfo: {
    relationshipType: string;
  };
  linkedStudents: LinkedStudent[];
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginCredentials {
  identifier: string;
  email?: string;
  password: string;
}

export interface RegisterStudentData {
  email: string;
  password: string;
  role: 'student';
  profile?: UserProfile;
  studentInfo?: {
    dateOfBirth?: string;
    grade?: string;
    school?: string;
  };
}

export interface RegisterParentData {
  email: string;
  password: string;
  role: 'parent';
  profile?: UserProfile;
  parentInfo?: {
    relationshipType?: string;
    linkedStudentId?: string;
  };
}

export type RegisterData = RegisterStudentData | RegisterParentData;

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    roleData?: Student | Parent;
    token: string;
    refreshToken: string;
    requiresParentalConsent?: boolean;
  };
}

// Mood types
export interface MoodEntry {
  _id: string;
  studentId: string;
  mood: {
    primary: MoodEmotion;
    secondary?: MoodEmotion[];
    intensity: number;
  };
  triggers?: string[];
  activities?: string[];
  location?: string;
  notes?: string;
  aiAnalysis?: {
    emotionScores: Record<string, number>;
    sentimentPolarity: number;
    crisisIndicators: string[];
    confidence: number;
  };
  detectionMethod: 'self-report' | 'text-analysis' | 'voice-analysis' | 'behavioral-analysis';
  riskLevel?: RiskLevel;
  createdAt: string;
  updatedAt: string;
}

// Journal types
export interface JournalEntry {
  _id?: string;
  id?: string;
  studentId: string;
  title?: string;
  content: string;
  moodTag: MoodEmotion;
  entryType: 'free_writing' | 'guided_prompt' | 'mood_reflection' | 'goal_setting' | 'gratitude' | 'crisis_note';
  prompt?: string;
  moodBefore?: { emotion: MoodEmotion; intensity: number };
  moodAfter?: { emotion: MoodEmotion; intensity: number };
  aiAnalysis?: {
    emotions: Record<string, number>;
    sentimentPolarity: number;
    keyThemes: string[];
    crisisIndicators: string[];
    wordCount: number;
  };
  tags?: string[];
  category?: string;
  privacyLevel: 'private' | 'therapist_only' | 'parent_visible' | 'emergency_only';
  flags?: {
    requiresAttention: boolean;
    crisisDetected: boolean;
  };
  moodImprovement?: number;
  createdAt: string;
  updatedAt: string;
  sentimentPolarity?: number;
  wordCount?: number;
}

export interface JournalPayload {
  title: string;
  content: string;
  moodTag: MoodEmotion;
}

export interface JournalAnalytics {
  totals: {
    entries: number;
    wordCount: number;
  };
  sentiment: {
    average: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  moodTagFrequency: Record<string, number>;
  emotionalTrend: Array<{
    date: string;
    averageSentiment: number;
    dominantMood: string;
    entries: number;
  }>;
}

export interface ParentDashboardData {
  student: {
    id: string;
    name: string;
  } | null;
  moodTrends: Array<{
    date: string;
    mood: MoodEmotion;
    intensity: number;
  }>;
  recentQuestionnaireResults: Array<{
    sessionId: string;
    result: string;
    riskLevel: RiskLevel | 'medium';
    confidence: number;
    completedAt: string;
  }>;
  riskLevel: RiskLevel | 'medium';
  emotionalHealthSummary: {
    dominantMood: MoodEmotion | string;
    averageMoodIntensity: number;
    currentRiskLevel: RiskLevel | 'medium';
  };
  journalSentimentSummary: {
    averageSentiment: number;
    positiveEntries: number;
    negativeEntries: number;
    neutralEntries: number;
  };
  monthlyMoodReport: Array<{
    date: string;
    averageIntensity: number;
    entries: number;
    dominantMood: MoodEmotion | string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    riskLevel: RiskLevel | 'medium';
    createdAt: string;
    status: string;
    alertTypes: string[];
  }>;
}

export interface StudentDashboardData {
  mentalHealthScore: number;
  riskLevel: RiskLevel | 'medium';
  todayMood: {
    mood: MoodEmotion;
    intensity: number;
    loggedAt: string;
  } | null;
  questionnaireResults: {
    sessionId: string;
    prediction: string;
    confidence: number;
    completedAt: string;
  } | null;
  recentJournalEntries: Array<{
    id: string;
    title: string;
    moodTag: MoodEmotion | string;
    sentimentPolarity: number;
    createdAt: string;
  }>;
  aiSuggestions: string[];
}

// Chat types
export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  emotionDetected?: MoodEmotion;
  crisisDetected?: boolean;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  startedAt: string;
  endedAt?: string;
  summary?: {
    overallMood: MoodEmotion;
    keyTopics: string[];
    riskLevel: RiskLevel;
    recommendations: string[];
  };
}

// Alert types
export interface Alert {
  _id: string;
  studentId: string;
  parentIds: string[];
  alertType: 'mood_decline' | 'risk_increase' | 'emergency' | 'milestone';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggerData?: Record<string, unknown>;
  status: 'new' | 'acknowledged' | 'addressed' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

// Analytics types
export interface MoodAnalytics {
  date: string;
  dominant: MoodEmotion;
  total: number;
  avgIntensity: number;
  entries: MoodEntry[];
}

export interface DashboardData {
  student?: Student;
  recentMoods: MoodEntry[];
  moodTrends: MoodAnalytics[];
  riskLevel: RiskLevel;
  journalCount: number;
  chatSessions: number;
  alerts: Alert[];
  insights: string[];
  suggestions: string[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Questionnaire Types ─────────────────────────────────────────────────────

export interface QuestionOption {
  value: number;
  label: string;
  description?: string;
}

export interface Question {
  questionId: string;
  questionText: string;
  category: 'stress' | 'anxiety' | 'sleep' | 'social' | 'academic' | 'emotional';
  questionType: 'likert_5' | 'likert_7' | 'yes_no' | 'multiple_choice';
  options: QuestionOption[];
  isRequired: boolean;
  order: number;
}

export interface QuestionnaireInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number;
  totalQuestions: number;
  requiredQuestions: number;
}

export interface StartSessionResponse {
  sessionId: string;
  questionnaire: {
    id: string;
    name: string;
    description: string;
    questions: Question[];
  };
  currentProgress?: number;
  existingResponses?: { questionId: string; answer: number | null }[];
}

export type MentalState = 'Normal' | 'Mild Stress' | 'High Stress' | 'Depression Risk';

export interface FeatureVector {
  stress:    number;
  anxiety:   number;
  sleep:     number;
  social:    number;
  academic:  number;
  emotional: number;
}

export interface MLPrediction {
  result:          MentalState;
  riskLevel:       RiskLevel;
  confidence:      number;
  recommendations: string[];
  flagged?:        boolean;
}

export interface CategoryScores {
  stress:    number;
  anxiety:   number;
  sleep:     number;
  social:    number;
  academic:  number;
  emotional: number;
}

export interface QuestionnaireResult {
  sessionId:     string;
  scores: {
    normalized: { total: number; byCategory: CategoryScores };
  };
  prediction:    MLPrediction;
  featureVector: FeatureVector;
  completedAt:   string;
}

export interface LatestQuestionnaireResult {
  sessionId: string;
  questionnaire?: {
    name?: string;
    description?: string;
    category?: string;
  };
  prediction: MLPrediction;
  featureVector: Partial<FeatureVector>;
  completedAt: string;
}

export interface OpenRouterAssessmentAnswer {
  questionId: string;
  questionText: string;
  category?: string;
  value: number;
  optionLabel: string;
}

export interface OpenRouterAssessmentResult {
  result: string;
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  recommendations: string[];
  warningSigns: string[];
}

export interface OpenRouterPredictionResponse {
  studentId: string | null;
  totalQuestions: number;
  source: 'openrouter' | 'fallback';
  prediction: OpenRouterAssessmentResult;
}