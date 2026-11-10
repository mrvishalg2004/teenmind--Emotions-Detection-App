const { verifyToken, extractToken } = require('../utils/jwt.utils');
const User = require('../models/User');

/**
 * Authentication middleware to protect routes
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get fresh user data from database
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.'
      });
    }

    // Add user to request object for use in route handlers
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles for the route
 */
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * Useful for endpoints that work differently for authenticated vs unauthenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    // Always proceed to next middleware/route handler
    next();

  } catch (error) {
    // Ignore authentication errors in optional auth
    console.warn('Optional auth warning:', error.message);
    next();
  }
};

/**
 * Middleware to ensure user can only access their own data or linked data
 * For students: can only access their own data
 * For parents: can access their own data and their linked student's data
 */
const dataAccessMiddleware = (req, res, next) => {
  const requestedUserId = req.params.userId || req.body.userId;
  const requestedStudentId = req.params.studentId || req.body.studentId;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Check if user is accessing their own data
  if (requestedUserId && requestedUserId.toString() === req.user._id.toString()) {
    return next();
  }

  // For parents: check if they're accessing their linked student's data
  if (req.user.role === 'parent' && requestedStudentId) {
    if (requestedStudentId === req.user.linkedStudentId) {
      return next();
    }
  }

  // For students: check if they're accessing their own student data
  if (req.user.role === 'student' && requestedStudentId) {
    if (requestedStudentId === req.user.studentId) {
      return next();
    }
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own data.'
  });
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  optionalAuth,
  dataAccessMiddleware
};