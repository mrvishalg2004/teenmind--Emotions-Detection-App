import express from 'express';
import MoodEntry from '../models/MoodEntry.js';
import Student from '../models/Student.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/mood
 * @desc    Log a mood entry for the authenticated student
 * @access  Private (student)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { primaryMood, intensity, triggers, activities, notes } = req.body;

    if (!primaryMood) {
      return res.status(400).json({ success: false, message: 'Primary mood is required' });
    }
    if (!intensity || intensity < 1 || intensity > 10) {
      return res.status(400).json({ success: false, message: 'Intensity must be between 1 and 10' });
    }

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const entry = new MoodEntry({
      studentId: student._id,
      mood: {
        primary: primaryMood,
        intensity: Number(intensity),
      },
      triggers: triggers || [],
      activities: activities || [],
      notes: notes || '',
      detectionMethod: 'self-report',
    });

    await entry.save();

    res.status(201).json({
      success: true,
      message: 'Mood logged successfully',
      data: { entry },
    });
  } catch (error) {
    console.error('Mood log error:', error);
    res.status(500).json({ success: false, message: 'Failed to log mood', error: error.message });
  }
});

/**
 * @route   GET /api/mood
 * @desc    Get mood history for the authenticated student
 * @access  Private (student)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const entries = await MoodEntry.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('mood triggers activities notes createdAt');

    res.json({
      success: true,
      data: { entries },
    });
  } catch (error) {
    console.error('Get mood history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mood history' });
  }
});

export default router;
