// ─── Questionnaire types ────────────────────────────────────────────────────

export interface QuestionOption {
  value: number;          // 1 – 5
  label: string;
  description?: string;
}

export interface Question {
  questionId: string;
  questionText: string;
  category: 'stress' | 'anxiety' | 'sleep' | 'social' | 'academic' | 'emotional';
  questionType: 'likert_5';
  options: QuestionOption[];
  isRequired: boolean;
  order: number;
}

export interface QuestionnaireData {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number;
  totalQuestions: number;
  questions: Question[];
}

export interface QuestionnaireSession {
  sessionId: string;
  questionnaire: QuestionnaireData;
  existingResponses?: QuestionResponse[];
  currentProgress?: number;
}

export interface QuestionResponse {
  questionId: string;
  questionText: string;
  answer: number | null;
  isSkipped: boolean;
}

// ─── Feature vector sent to ML service ───────────────────────────────────────

export interface FeatureVector {
  stress: number;
  anxiety: number;
  sleep: number;
  social: number;
  academic: number;
  emotional: number;
}

// ─── ML prediction result ─────────────────────────────────────────────────────

export type MentalState =
  | 'Normal'
  | 'Mild Stress'
  | 'High Stress'
  | 'Depression Risk';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface PredictionResult {
  prediction: MentalState;
  riskLevel: RiskLevel;
  confidence: number;       // 0 – 1
  recommendations: string[];
  featureVector: FeatureVector;
  scores: {
    normalized: {
      total: number;
      byCategory: Record<keyof FeatureVector, number>;
    };
  };
}

// ─── Dashboard summary card ────────────────────────────────────────────────────

export interface LastAssessmentSummary {
  completedAt: string;
  prediction: MentalState;
  riskLevel: RiskLevel;
  confidence: number;
  recommendations: string[];
}
