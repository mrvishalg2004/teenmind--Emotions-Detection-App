import { apiClient } from './api';
import {
  QuestionnaireSession,
  PredictionResult,
  FeatureVector,
} from '../types/questionnaire.types';

/**
 * Service for interacting with the questionnaire API.
 * Covers the full lifecycle: start → answer per question → complete.
 * The complete call also triggers POST /ml/predict on the backend.
 */
export class QuestionnaireService {
  /** Fetch the active questionnaire and start (or resume) a session. */
  static async startSession(studentId: string, questionnaireId?: string): Promise<QuestionnaireSession> {
    // 1. If no questionnaireId supplied, fetch the first available one
    if (!questionnaireId) {
      const available = await apiClient.get<any>(`/questionnaire/available/${studentId}`);
      const first = available?.data?.available?.[0];
      if (!first) throw new Error('No questionnaire available for this student.');
      questionnaireId = first.id;
    }

    // 2. Start / resume session
    const response = await apiClient.post<any>('/questionnaire/start', {
      studentId,
      questionnaireId,
    });

    return response.data as QuestionnaireSession;
  }

  /** Send a single answer to an in-progress session. */
  static async submitAnswer(
    sessionId: string,
    questionId: string,
    answer: number,
    responseTime = 0,
  ): Promise<{ completionPercentage: number; isCompleted: boolean }> {
    const response = await apiClient.post<any>(`/questionnaire/session/${sessionId}/respond`, {
      questionId,
      answer,
      responseTime,
    });
    return response.data;
  }

  /**
   * Mark the session as complete.
   * The backend will compute scores, build the feature vector, call POST /ml/predict,
   * and return the ML prediction result.
   */
  static async completeSession(sessionId: string): Promise<PredictionResult> {
    const response = await apiClient.post<any>(`/questionnaire/session/${sessionId}/complete`, {});
    const { scores, prediction, featureVector } = response.data;

    return {
      prediction: prediction.result,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,
      recommendations: prediction.recommendations ?? [],
      featureVector: featureVector as FeatureVector,
      scores,
    };
  }

  /** Retrieve results for an already-completed session. */
  static async getResults(sessionId: string): Promise<PredictionResult> {
    const response = await apiClient.get<any>(`/questionnaire/session/${sessionId}/results`);
    const { scores, prediction, featureVector } = response.data;

    return {
      prediction: prediction.result,
      riskLevel: prediction.riskLevel,
      confidence: prediction.confidence,
      recommendations: prediction.recommendations ?? [],
      featureVector: featureVector as FeatureVector,
      scores,
    };
  }
}
