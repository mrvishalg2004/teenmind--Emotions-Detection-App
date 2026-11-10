import api from './api';

export interface MoodLogPayload {
  primaryMood: string;
  intensity: number;
  triggers?: string[];
  activities?: string[];
  notes?: string;
}

export interface MoodHistoryEntry {
  _id: string;
  mood: { primary: string; intensity: number };
  triggers: string[];
  activities: string[];
  notes: string;
  createdAt: string;
}

export const MoodService = {
  async log(payload: MoodLogPayload) {
    const response = await api.post('/mood', payload);
    return response.data;
  },

  async getHistory(limit = 20): Promise<MoodHistoryEntry[]> {
    const response = await api.get(`/mood?limit=${limit}`);
    return response.data?.data?.entries ?? [];
  },
};
