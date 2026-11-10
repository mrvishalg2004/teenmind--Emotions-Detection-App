import api from './api';
import type { ParentDashboardData } from '../types/mentalHealth';

const ParentService = {
  async getDashboard(): Promise<ParentDashboardData> {
    const { data } = await api.get('/parent/dashboard');
    return data.data;
  },

  async linkStudent(studentId: string): Promise<void> {
    try {
      const { data } = await api.post('/parent/link-student', { studentId });
      if (!data.success) {
        throw new Error(data.message || 'Failed to link student');
      }
    } catch (err: unknown) {
      // Extract meaningful server message from Axios error response
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const serverMessage = axiosErr?.response?.data?.message;
      if (serverMessage) {
        throw new Error(serverMessage);
      }
      throw err;
    }
  },
};

export default ParentService;
