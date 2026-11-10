const { body, validationResult, param } = require('express-validator');
const User = require('../models/User');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }

  next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom(async (email) => {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('Email is already registered');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('role')
    .isIn(['student', 'parent'])
    .withMessage('Role must be either student or parent'),

  body('linkedStudentId')
    .if(body('role').equals('parent'))
    .notEmpty()
    .withMessage('Student ID is required for parent accounts')
    .custom(async (studentId) => {
      const student = await User.findOne({
        studentId,
        role: 'student',
        isActive: true
      });
      if (!student) {
        throw new Error('Invalid student ID. Student not found.');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

/**
 * Validation rules for password change
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for profile update
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom(async (email, { req }) => {
      if (email && req.user) {
        const existingUser = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: req.user._id }
        });
        if (existingUser) {
          throw new Error('Email is already registered');
        }
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for MongoDB ObjectId parameters
 */
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),

  handleValidationErrors
];

/**
 * Validation rules for student ID parameter
 */
const validateStudentId = [
  param('studentId')
    .isUUID(4)
    .withMessage('Invalid student ID format'),

  handleValidationErrors
];

/**
 * Custom validation for mental health questionnaire data
 */
const validateQuestionnaireData = [
  body('responses')
    .isArray({ min: 1 })
    .withMessage('Responses must be a non-empty array'),

  body('responses.*.questionId')
    .isMongoId()
    .withMessage('Each response must have a valid question ID'),

  body('responses.*.answer')
    .notEmpty()
    .withMessage('Each response must have an answer'),

  body('completedAt')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Completed date must be a valid ISO date'),

  handleValidationErrors
];

/**
 * Validation for mood tracking data
 */
const validateMoodData = [
  body('mood')
    .isInt({ min: 1, max: 10 })
    .withMessage('Mood must be a number between 1 and 10'),

  body('energy')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Energy must be a number between 1 and 10'),

  body('stress')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Stress must be a number between 1 and 10'),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date must be a valid ISO date'),

  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
  validateObjectId,
  validateStudentId,
  validateQuestionnaireData,
  validateMoodData,
  handleValidationErrors
};