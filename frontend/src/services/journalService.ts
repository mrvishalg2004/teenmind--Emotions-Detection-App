import api from './api';
import type { JournalEntry, JournalPayload, JournalAnalytics } from '../types/mentalHealth';

const JournalService = {
  async list(): Promise<JournalEntry[]> {
    const { data } = await api.get('/journal');
    return data.data;
  },

  async create(payload: JournalPayload): Promise<JournalEntry> {
    const { data } = await api.post('/journal', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<JournalPayload>): Promise<JournalEntry> {
    const { data } = await api.put(`/journal/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/journal/${id}`);
  },

  async getAnalytics(days = 30): Promise<JournalAnalytics> {
    const { data } = await api.get('/journal/analytics/summary', {
      params: { days }
    });
    return data.data;
  },
};

export default JournalService;
