import api from './api';
import type {
  QuestionnaireInfo,
  StartSessionResponse,
  QuestionnaireResult,
  LatestQuestionnaireResult,
  OpenRouterAssessmentAnswer,
  OpenRouterPredictionResponse,
} from '../types/mentalHealth';

const Q = {
  /** Questionnaires available for a student */
  async getAvailable(studentId: string): Promise<{
    available: QuestionnaireInfo[];
    inProgress: { sessionId: string; questionnaireId: string; startedAt: string }[];
  }> {
    const { data } = await api.get(`/questionnaire/available/${studentId}`);
    return data.data;
  },

  /** Start (or resume) a questionnaire session */
  async start(studentId: string, questionnaireId: string): Promise<StartSessionResponse> {
    const { data } = await api.post('/questionnaire/start', { studentId, questionnaireId });
    return data.data;
  },

  /** Save a single answer */
  async saveAnswer(
    sessionId: string,
    questionId: string,
    answer: number,
    responseTime?: number,
  ): Promise<{ completionPercentage: number; isCompleted: boolean }> {
    const { data } = await api.put(`/questionnaire/session/${sessionId}/respond`, {
      questionId,
      answer,
      responseTime,
    });
    return data.data;
  },

  /** Submit completed questionnaire – triggers ML prediction */
  async complete(sessionId: string): Promise<QuestionnaireResult> {
    const { data } = await api.post(`/questionnaire/session/${sessionId}/complete`);
    return data.data;
  },

  /** Fetch results for an already-completed session */
  async getResults(sessionId: string): Promise<QuestionnaireResult> {
    const { data } = await api.get(`/questionnaire/results/${sessionId}`);
    return data.data;
  },

  /** Fetch latest completed questionnaire result for dashboard */
  async getLatestResult(studentId: string): Promise<LatestQuestionnaireResult | null> {
    try {
      const { data } = await api.get(`/questionnaire/latest/${studentId}`);
      return data.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /** Run 10-question assessment prediction using OpenRouter */
  async openRouterPredict(
    answers: OpenRouterAssessmentAnswer[],
    studentId?: string,
  ): Promise<OpenRouterPredictionResponse> {
    const { data } = await api.post('/questionnaire/openrouter-predict', {
      answers,
      studentId,
    });
    return data.data;
  },
};

export default Q;