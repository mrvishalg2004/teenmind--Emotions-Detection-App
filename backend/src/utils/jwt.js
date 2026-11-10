import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * JWT Utility functions for token generation and verification
 */

/**
 * Generate JWT token for a user
 * @param {Object} payload - User data to include in token
 * @returns {string} JWT token string
 */
export const generateToken = (payload) => {
  try {
    // Remove sensitive fields from payload
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      role: payload.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
      issuer: 'teenmind-api',
      audience: 'teenmind-app'
    });

    return token;
  } catch (error) {
    throw new Error(`Token generation failed: ${error.message}`);
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'teenmind-api',
      audience: 'teenmind-app'
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not active');
    } else {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error(`Token decode failed: ${error.message}`);
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - User data to include in refresh token
 * @returns {string} Refresh token string
 */
export const generateRefreshToken = (payload) => {
  try {
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d', // Refresh tokens last longer
      issuer: 'teenmind-api',
      audience: 'teenmind-refresh'
    });
  } catch (error) {
    throw new Error(`Refresh token generation failed: ${error.message}`);
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'teenmind-api',
      audience: 'teenmind-refresh'
    });

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token string or null
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;

  // Support both "Bearer <token>" and "Token <token>" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && ['Bearer', 'Token'].includes(parts[0])) {
    return parts[1];
  }

  return null;
};

/**
 * Generate password reset token
 * @param {Object} payload - User data for password reset
 * @returns {string} Password reset token
 */
export const generatePasswordResetToken = (payload) => {
  try {
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      type: 'password_reset',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1h', // Password reset tokens are short-lived
      issuer: 'teenmind-api',
      audience: 'teenmind-password-reset'
    });
  } catch (error) {
    throw new Error(`Password reset token generation failed: ${error.message}`);
  }
};

/**
 * Verify password reset token
 * @param {string} token - Password reset token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'teenmind-api',
      audience: 'teenmind-password-reset'
    });

    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid password reset token type');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Password reset token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid password reset token');
    } else {
      throw new Error(`Password reset token verification failed: ${error.message}`);
    }
  }
};

/**
 * Check if token is expired (without throwing error)
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded.exp) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true; // Consider invalid tokens as expired
  }
};

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiry date or null
 */
export const getTokenExpiry = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};