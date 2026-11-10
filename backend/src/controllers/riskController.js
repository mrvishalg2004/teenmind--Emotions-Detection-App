import Student from '../models/Student.js';
import { evaluateStudentRisk } from '../services/riskDetectionService.js';

export const evaluateRiskForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const result = await evaluateStudentRisk(studentId, 'manual');

    return res.json({
      success: true,
      message: 'Risk evaluation completed',
      data: result,
    });
  } catch (error) {
    console.error('Risk evaluation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to evaluate risk' });
  }
};
