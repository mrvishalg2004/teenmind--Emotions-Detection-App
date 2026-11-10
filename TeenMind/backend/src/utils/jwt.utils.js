const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user
 * @param {Object} payload - User data to encode in token
 * @returns {string} - JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'teenmind-api'
    }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate authentication response with token and user data
 * @param {Object} user - User document from database
 * @returns {Object} - Authentication response object
 */
const generateAuthResponse = (user) => {
  const tokenPayload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    linkedStudentId: user.linkedStudentId
  };

  const token = generateToken(tokenPayload);

  return {
    success: true,
    message: 'Authentication successful',
    token,
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
};

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
const extractToken = (authHeader) => {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

module.exports = {
  generateToken,
  verifyToken,
  generateAuthResponse,
  extractToken
};