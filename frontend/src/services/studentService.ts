import api from './api';
import type { StudentDashboardData } from '../types/mentalHealth';

const StudentService = {
  async getDashboard(): Promise<StudentDashboardData> {
    const { data } = await api.get('/student/dashboard', {
      params: { t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    return data.data;
  },
};

export default StudentService;
