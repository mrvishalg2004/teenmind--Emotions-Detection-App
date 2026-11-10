import { getStudentDashboardSummary } from '../services/riskDetectionService.js';

export const getStudentDashboard = async (req, res) => {
  try {
    const data = await getStudentDashboardSummary(req.user._id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load student dashboard' });
  }
};
