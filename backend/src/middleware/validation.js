import { body, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
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
export const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ min: 5, max: 100 })
    .withMessage('Email must be between 5 and 100 characters'),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('role')
    .isIn(['student', 'parent'])
    .withMessage('Role must be either student or parent'),

  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('profile.phoneNumber')
    .optional()
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),

  // Student-specific validations
  body('studentInfo.dateOfBirth')
    .if(body('role').equals('student'))
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const dob = new Date(value);
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 13 || age > 25) {
        throw new Error('Student must be between 13 and 25 years old');
      }
      return true;
    }),

  body('studentInfo.grade')
    .if(body('role').equals('student'))
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Grade must be between 1 and 20 characters'),

  body('studentInfo.school')
    .if(body('role').equals('student'))
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('School name must be between 1 and 100 characters'),

  // Parent-specific validations
  body('parentInfo.relationshipType')
    .if(body('role').equals('parent'))
    .optional()
    .isIn(['parent', 'legal_guardian', 'foster_parent', 'grandparent', 'sibling', 'other'])
    .withMessage('Invalid relationship type'),

  body('parentInfo.linkedStudentId')
    .if(body('role').equals('parent'))
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Please provide a valid student ID'),

  handleValidationErrors
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body().custom((value) => {
    const identifier = (value?.identifier || value?.email || '').toString().trim();

    if (!identifier) {
      throw new Error('Email or student ID is required');
    }

    // If input looks like email, validate format
    if (identifier.includes('@') && !/^\S+@\S+\.\S+$/.test(identifier)) {
      throw new Error('Please provide a valid email address');
    }

    return true;
  }),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('identifier')
    .optional()
    .isString()
    .withMessage('Identifier must be a string')
    .trim(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for password reset request
 */
export const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  handleValidationErrors
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('profile.phoneNumber')
    .optional()
    .matches(/^\+?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),

  body('notificationSettings.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification setting must be a boolean'),

  body('notificationSettings.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification setting must be a boolean'),

  body('privacySettings.shareDataWithParents')
    .optional()
    .isBoolean()
    .withMessage('Share data with parents setting must be a boolean'),

  body('privacySettings.allowResearch')
    .optional()
    .isBoolean()
    .withMessage('Allow research setting must be a boolean'),

  handleValidationErrors
];

/**
 * Validation rules for parental consent
 */
export const validateParentalConsent = [
  body('studentId')
    .isMongoId()
    .withMessage('Please provide a valid student ID'),

  body('consentGiven')
    .isBoolean()
    .withMessage('Consent status must be a boolean'),

  body('parentId')
    .isMongoId()
    .withMessage('Please provide a valid parent ID'),

  handleValidationErrors
];

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (req, res, next) => {
  // Basic XSS protection - remove script tags and dangerous attributes
  const sanitizeValue = (value) => {
    if (typeof value !== 'string') return value;

    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          obj[key] = sanitizeValue(obj[key]);
        }
      }
    }
  };

  if (req.body) {
    sanitizeObject(req.body);
  }

  if (req.query) {
    sanitizeObject(req.query);
  }

  if (req.params) {
    sanitizeObject(req.params);
  }

  next();
};