import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and loads user data
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header or x-auth-token header
    const authHeader = req.header('Authorization') || req.header('x-auth-token');
    const token = extractTokenFromHeader(authHeader) || req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Load user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account deactivated. Please contact support.'
      });
    }

    // Add user to request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error.message);

    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid token'
    });
  }
};

/**
 * Authorization middleware to check user roles
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Loads user if token is provided, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization') || req.header('x-auth-token');
    const token = extractTokenFromHeader(authHeader) || req.header('x-auth-token');

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');

        if (user && user.isActive) {
          req.user = user;
          req.token = token;
        }
      } catch (error) {
        // Token invalid or expired, but continue without authentication
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if there's an error
    next();
  }
};

/**
 * Parental consent middleware for student routes
 * Ensures students have proper parental consent
 */
export const requireParentalConsent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Only apply to students
  if (req.user.role !== 'student') {
    return next();
  }

  const { parentalConsent } = req.user;

  // Check if parental consent is required and given
  if (parentalConsent?.isRequired && !parentalConsent?.consentGiven) {
    return res.status(403).json({
      success: false,
      message: 'Parental consent required for this action',
      requiresConsent: true
    });
  }

  next();
};

/**
 * Student data access middleware
 * Ensures users can only access their own data or authorized data
 */
export const authorizeStudentAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const targetStudentId = req.params.studentId || req.body.studentId || req.query.studentId;

    // Students can access their own data
    if (req.user.role === 'student') {
      // Load student record to get the studentId link
      const Student = (await import('../models/Student.js')).default;
      const student = await Student.findOne({ userId: req.user._id });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      // Check if trying to access own data
      if (targetStudentId && student._id.toString() !== targetStudentId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Can only access own data'
        });
      }

      req.studentProfile = student;
    }

    // Parents can access their linked students' data
    else if (req.user.role === 'parent') {
      const Parent = (await import('../models/Parent.js')).default;
      const parent = await Parent.findOne({ userId: req.user._id });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent profile not found'
        });
      }

      // Check if parent can access this student's data
      const hasAccess = parent.canViewStudentData(targetStudentId);
      if (targetStudentId && !hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Not authorized to view this student\'s data'
        });
      }

      req.parentProfile = parent;
    }

    // Counselors can access assigned students (placeholder for now)
    else if (req.user.role === 'counselor') {
      // In a full implementation, check counselor-student assignments
      // For now, allow all counselor access
    }

    else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid role for this resource'
      });
    }

    next();
  } catch (error) {
    console.error('Student access authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Rate limiting middleware for sensitive operations
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum requests per window
 */
export const rateLimitSensitive = (windowMs = 15 * 60 * 1000, max = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user._id : '');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create attempt record
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);

    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => time > windowStart);
    attempts.set(key, recentAttempts);

    // Check if rate limit exceeded
    if (recentAttempts.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current attempt
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

/**
 * Middleware to log authentication events
 */
export const logAuthEvent = (eventType) => {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(body) {
      // Log successful authentication events
      if (body.success && req.user) {
        console.log(`Auth Event: ${eventType}`, {
          userId: req.user._id,
          email: req.user.email,
          role: req.user.role,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};