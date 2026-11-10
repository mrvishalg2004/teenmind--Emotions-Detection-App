import Parent from '../models/Parent.js';
import Student from '../models/Student.js';
import { getParentDashboardSummary } from '../services/riskDetectionService.js';

export const getParentDashboard = async (req, res) => {
  try {
    const data = await getParentDashboardSummary(req.user._id);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Parent dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load parent dashboard' });
  }
};

export const linkStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const cleanId = String(studentId).replace(/\s+/g, '').trim();

    console.log(`[Link Student] Searching for studentId: "${cleanId}"`);

    // Find student by their custom studentId field - case-insensitive, exact match
    const student = await Student.findOne({
      studentId: { $regex: new RegExp(`^${cleanId}$`, 'i') }
    }).select('_id studentId userId');

    console.log(`[Link Student] Found student:`, student ? student.studentId : 'NOT FOUND');

    if (!student) {
      return res.status(400).json({
        success: false,
        message: `Student with ID "${cleanId}" not found. Please check the 4-digit ID shown on your child's dashboard and try again.`
      });
    }

    // Find or auto-create the parent profile (handles cases where registration succeeded
    // for the User but the Parent document was not saved)
    let parent = await Parent.findOne({ userId: req.user._id });

    if (!parent) {
      console.log(`[Link Student] Parent profile missing for userId ${req.user._id} — auto-creating.`);
      parent = new Parent({
        userId: req.user._id,
        parentInfo: { relationshipType: 'parent' },
        linkedStudents: [],
      });
      await parent.save();
    }

    // Check if already linked
    const alreadyLinked = parent.linkedStudents.some(
      (link) => link.studentId.toString() === student._id.toString()
    );

    if (alreadyLinked) {
      return res.status(400).json({ success: false, message: 'This student is already linked to your account' });
    }

    // Add the student to parent's linkedStudents
    parent.linkedStudents.push({
      studentId: student._id,
      relationshipType: 'parent',
      isPrimary: true,
      canViewReports: true,
      canReceiveAlerts: true,
      consentGiven: true,
      consentDate: new Date(),
    });

    await parent.save();

    // Add parent to student's parentIds
    await Student.findByIdAndUpdate(
      student._id,
      { $addToSet: { parentIds: req.user._id } }
    );

    console.log(`[Link Student] SUCCESS - Parent ${req.user.email} linked to student ${student.studentId}`);

    return res.json({
      success: true,
      message: 'Student linked successfully',
      data: { studentId: student.studentId }
    });

  } catch (error) {
    console.error('Link student error:', error);
    return res.status(500).json({ success: false, message: 'Failed to link student' });
  }
};
