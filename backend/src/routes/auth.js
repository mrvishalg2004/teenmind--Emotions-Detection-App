import express from 'express';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, generatePasswordResetToken, verifyPasswordResetToken } from '../utils/jwt.js';
import { authenticate, authorize, optionalAuth, rateLimitSensitive, logAuthEvent } from '../middleware/auth.js';
import {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateProfileUpdate,
  validateParentalConsent,
  sanitizeInput
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (student or parent)
 * @access  Public
 */
router.post('/register',
  rateLimitSensitive(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  sanitizeInput,
  ...validateRegistration,
  logAuthEvent('REGISTER_ATTEMPT'),
async (req, res) => {
  try {
    const { email, password, role, profile, studentInfo, parentInfo } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create base user
    const userData = {
      email: email.toLowerCase(),
      password,
      role,
      profile: profile || {}
    };

    // Set parental consent requirements for students
    if (role === 'student') {
      userData.parentalConsent = {
        isRequired: true, // Assume all students are minors requiring consent
        consentGiven: false
      };
    }

    const user = new User(userData);
    await user.save();

    // Create role-specific profile
    if (role === 'student') {
      const studentData = {
        userId: user._id,
        personalInfo: {
          dateOfBirth: studentInfo?.dateOfBirth,
          emergencyContacts: studentInfo?.emergencyContacts || []
        },
        academicInfo: {
          grade: studentInfo?.grade,
          school: studentInfo?.school
        },
        appUsage: {
          onboardingCompleted: false
        }
      };

      const student = new Student(studentData);
      await student.save();

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Remove password from response
      user.password = undefined;

      res.status(201).json({
        success: true,
        message: 'Student account created successfully',
        data: {
          user,
          roleData: student,
          token,
          refreshToken,
          requiresParentalConsent: true
        }
      });

    } else if (role === 'parent') {
      // Resolve custom studentId (e.g. "STUABC123") → MongoDB _id
      let resolvedStudentObjectId = null;
      if (parentInfo?.linkedStudentId) {
        // Strip all whitespace/invisible chars and uppercase
        const cleanStudentId = parentInfo.linkedStudentId.replace(/\s+/g, '').trim().toUpperCase();

        console.log(`[Parent Register] Looking up studentId: "${cleanStudentId}"`);

        const foundStudent = await Student.findOne({
          studentId: { $regex: new RegExp(`^${cleanStudentId}$`, 'i') }
        }).select('_id studentId');

        console.log(`[Parent Register] Found student:`, foundStudent ? foundStudent.studentId : 'NOT FOUND');

        if (!foundStudent) {
          // Clean up created user before returning error
          await User.findByIdAndDelete(user._id);
          return res.status(400).json({
            success: false,
            message: `Student with ID "${cleanStudentId}" not found. Please check the ID from the student's dashboard and try again.`
          });
        }
        resolvedStudentObjectId = foundStudent._id;
      }

      const parentData = {
        userId: user._id,
        parentInfo: {
          relationshipType: parentInfo?.relationshipType || 'parent'
        },
        linkedStudents: resolvedStudentObjectId ? [{
          studentId: resolvedStudentObjectId,
          relationshipType: parentInfo.relationshipType || 'parent',
          isPrimary: true,
          canViewReports: true,
          canReceiveAlerts: true,
          consentGiven: true,
          consentDate: new Date()
        }] : []
      };

      const parent = new Parent(parentData);
      await parent.save();

      // Update student's parent list
      if (resolvedStudentObjectId) {
        await Student.findByIdAndUpdate(
          resolvedStudentObjectId,
          { $addToSet: { parentIds: user._id } }
        );
      }

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // Remove password from response
      user.password = undefined;

      res.status(201).json({
        success: true,
        message: 'Parent account created successfully',
        data: {
          user,
          roleData: parent,
          token,
          refreshToken
        }
      });
    }

  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return token
 * @access  Public
 */
router.post('/login',
  rateLimitSensitive(15 * 60 * 1000, 10), // 10 attempts per 15 minutes
  sanitizeInput,
  ...validateLogin,
  logAuthEvent('LOGIN_ATTEMPT'),
async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = (identifier || email || '').trim();

    let user = null;

    // Login via email
    if (loginIdentifier.includes('@')) {
      user = await User.findOne({
        email: loginIdentifier.toLowerCase(),
        isActive: true
      }).select('+password');
    }
    // Login via Student ID (example: STUABC1234)
    else {
      const student = await Student.findOne({
        studentId: loginIdentifier.toUpperCase()
      }).select('userId');

      if (student) {
        user = await User.findOne({
          _id: student.userId,
          isActive: true
        }).select('+password');
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Load role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findOne({ userId: user._id });
    } else if (user.role === 'parent') {
      roleData = await Parent.findOne({ userId: user._id }).populate('linkedStudents.studentId');
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Remove password from response
    user.password = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        roleData,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', [authenticate, logAuthEvent('PROFILE_ACCESS')], async (req, res) => {
  try {
    const user = req.user;

    // Load role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findOne({ userId: user._id });
    } else if (user.role === 'parent') {
      roleData = await Parent.findOne({ userId: user._id }).populate('linkedStudents.studentId');
    }

    res.json({
      success: true,
      data: {
        user,
        roleData
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', rateLimitSensitive(15 * 60 * 1000, 20), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if user still exists and is active
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newToken = generateToken(user);

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client should remove tokens)
 * @access  Public (optional auth)
 */
router.post('/logout', [optionalAuth, logAuthEvent('LOGOUT')], async (req, res) => {
  try {
    // In a more sophisticated implementation, you might:
    // 1. Add token to blacklist
    // 2. Update user's last logout time
    // 3. Clear any session data

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
  authenticate,
  sanitizeInput,
  validateProfileUpdate,
  logAuthEvent('PROFILE_UPDATE')
], async (req, res) => {
  try {
    const updates = req.body;
    const user = req.user;

    // Update user fields
    const allowedFields = ['profile', 'notificationSettings', 'privacySettings'];
    const userUpdates = {};

    allowedFields.forEach(field => {
      if (updates[field]) {
        userUpdates[field] = { ...user[field], ...updates[field] };
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      userUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', [
  authenticate,
  rateLimitSensitive(15 * 60 * 1000, 3), // 3 attempts per 15 minutes
  sanitizeInput,
  validatePasswordChange,
  logAuthEvent('PASSWORD_CHANGE')
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Password change failed'
    });
  }
});

/**
 * @route   POST /api/auth/parental-consent
 * @desc    Handle parental consent for student accounts
 * @access  Private (Parent only)
 */
router.post('/parental-consent', [
  authenticate,
  authorize('parent'),
  sanitizeInput,
  validateParentalConsent,
  logAuthEvent('PARENTAL_CONSENT')
], async (req, res) => {
  try {
    const { studentId, consentGiven } = req.body;

    // Verify parent can give consent for this student
    const parent = await Parent.findOne({ userId: req.user._id });
    const hasAccess = parent.linkedStudents.some(
      link => link.studentId.toString() === studentId
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to give consent for this student'
      });
    }

    // Find student's user account
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update parental consent
    await User.findByIdAndUpdate(student.userId, {
      'parentalConsent.consentGiven': consentGiven,
      'parentalConsent.consentDate': consentGiven ? new Date() : null,
      'parentalConsent.parentId': consentGiven ? req.user._id : null
    });

    res.json({
      success: true,
      message: `Parental consent ${consentGiven ? 'granted' : 'revoked'} successfully`
    });

  } catch (error) {
    console.error('Parental consent error:', error);
    res.status(500).json({
      success: false,
      message: 'Parental consent update failed'
    });
  }
});

export default router;