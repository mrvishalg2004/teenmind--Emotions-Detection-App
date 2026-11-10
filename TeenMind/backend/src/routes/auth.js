const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password.utils');
const { generateAuthResponse } = require('../utils/jwt.utils');
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate
} = require('../middleware/validation.middleware');

const router = express.Router();

// Rate limiting for auth endpoints (more restrictive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (student or parent)
 * @access  Public
 */
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
  try {
    const { name, email, password, role, linkedStudentId } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user object based on role
    const userData = {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role
    };

    // Add role-specific fields
    if (role === 'parent') {
      userData.linkedStudentId = linkedStudentId;
    }

    // Create user
    const user = new User(userData);
    await user.save();

    console.log(`✅ New ${role} registered: ${email}`);

    // Generate authentication response
    const authResponse = generateAuthResponse(user);

    res.status(201).json(authResponse);

  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Student ID'} is already registered`
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login time
    await user.updateLastLogin();

    console.log(`✅ User logged in: ${email} (${user.role})`);

    // Generate authentication response
    const authResponse = generateAuthResponse(user);

    res.json(authResponse);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const user = req.user;

    // If user is a parent, include linked student info
    let responseData = {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        linkedStudentId: user.linkedStudentId,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    };

    // For parents, fetch linked student details
    if (user.role === 'parent' && user.linkedStudentId) {
      const linkedStudent = await User.findStudentById(user.linkedStudentId);
      if (linkedStudent) {
        responseData.linkedStudent = {
          id: linkedStudent._id,
          name: linkedStudent.name,
          studentId: linkedStudent.studentId,
          createdAt: linkedStudent.createdAt,
          lastLoginAt: linkedStudent.lastLoginAt
        };
      }
    }

    res.json(responseData);

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, validateProfileUpdate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;

    // Update fields if provided
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase();

    await user.save();

    console.log(`✅ Profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        linkedStudentId: user.linkedStudentId
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Profile update failed'
    });
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authMiddleware, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors
      });
    }

    // Hash new password
    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    console.log(`✅ Password changed: ${user.email}`);

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
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authMiddleware, (req, res) => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // This endpoint is mainly for logging purposes
  console.log(`✅ User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   GET /api/auth/verify-student-id/:studentId
 * @desc    Verify if a student ID exists (for parent registration)
 * @access  Public
 */
router.get('/verify-student-id/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findStudentById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student ID not found'
      });
    }

    res.json({
      success: true,
      message: 'Student ID is valid',
      student: {
        name: student.name,
        studentId: student.studentId
      }
    });

  } catch (error) {
    console.error('Student ID verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

module.exports = router;