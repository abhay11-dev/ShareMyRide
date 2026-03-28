/**
 * Token Helper Utilities
 * Provides cryptographically secure token generation, hashing, and verification
 * Industry-grade security for authentication flows
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a cryptographically secure token
 * Used for: Email verification tokens, password reset tokens, etc.
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Hex-encoded random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for secure storage
 * Never store plaintext tokens in database
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
const hashToken = async (token) => {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(token, salt);
  } catch (error) {
    console.error('❌ Error hashing token:', error);
    throw error;
  }
};

/**
 * Verify a token against its hash
 * @param {string} token - Plain token to verify
 * @param {string} hash - Hashed token from database
 * @returns {boolean} - True if token matches hash
 */
const verifyToken = async (token, hash) => {
  try {
    return await bcrypt.compare(token, hash);
  } catch (error) {
    console.error('❌ Error verifying token:', error);
    throw error;
  }
};

/**
 * Generate OTP for 2FA and email verification
 * 6-digit OTP for user-friendly input
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Get OTP expiration time
 * Default: 10 minutes for 2FA, 15 minutes for email verification
 * @param {number} minutes - Expiration time in minutes
 * @returns {Date} - Expiration timestamp
 */
const getTokenExpiration = (minutes = 15) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if token/OTP is expired
 * @param {Date} expireTime - Expiration timestamp
 * @returns {boolean} - True if expired
 */
const isTokenExpired = (expireTime) => {
  return new Date() > expireTime;
};

/**
 * Generate verification token object
 * @param {number} expiryMinutes - Token expiry in minutes
 * @returns {Object} - {token, hashedToken, expiry}
 */
const generateVerificationToken = async (expiryMinutes = 15) => {
  // Use a 6-digit numeric OTP for email verification (user-friendly)
  const token = generateOTP();
  const hashedToken = await hashToken(token);
  const expiry = getTokenExpiration(expiryMinutes);

  return {
    token,           // Send numeric OTP to user
    hashedToken,     // Store hashed OTP in database
    expiry
  };
};

/**
 * Generate password reset token object
 * @param {number} expiryMinutes - Token expiry in minutes (default: 20)
 * @returns {Object} - {token, hashedToken, expiry}
 */
const generatePasswordResetToken = async (expiryMinutes = 20) => {
  const token = generateSecureToken(32);
  const hashedToken = await hashToken(token);
  const expiry = getTokenExpiration(expiryMinutes);

  return {
    token,           // Send to user in email
    hashedToken,     // Store in database
    expiry
  };
};

/**
 * Generate 2FA OTP object
 * @param {number} expiryMinutes - OTP expiry in minutes (default: 10)
 * @returns {Object} - {otp, hashedOTP, expiry}
 */
const generate2FAOTP = async (expiryMinutes = 10) => {
  const otp = generateOTP();
  const hashedOTP = await hashToken(otp);
  const expiry = getTokenExpiration(expiryMinutes);

  return {
    otp,             // Send to user
    hashedOTP,       // Store in database
    expiry
  };
};

/**
 * Rate limiting helper
 * Check if an action should be rate limited
 * @param {Object} obj - Object to check (e.g., user)
 * @param {string} field - Field tracking attempt count (e.g., 'loginAttempts')
 * @param {number} limit - Max attempts allowed
 * @param {number} windowMinutes - Rate limit window in minutes
 * @returns {Object} - {allowed: boolean, message: string}
 */
const checkRateLimit = (obj, field, limit = 5, windowMinutes = 15) => {
  // Store numeric count in obj[field] and timestamp in obj[`${field}Reset`]
  const resetField = `${field}Reset`;
  if (typeof obj[field] !== 'number') {
    obj[field] = 0;
  }
  if (!obj[resetField]) {
    obj[resetField] = new Date();
  }

  const count = obj[field];
  const resetTime = obj[resetField];
  const now = new Date();
  const windowMs = windowMinutes * 60 * 1000;

  // Reset if window expired
  if (now - resetTime > windowMs) {
    obj[field] = 0;
    obj[resetField] = now;
    return { allowed: true };
  }

  // Check limit
  if (count >= limit) {
    return {
      allowed: false,
      message: `Too many attempts. Please try again in ${Math.ceil((resetTime.getTime() + windowMs - now.getTime()) / 60000)} minutes.`
    };
  }

  return { allowed: true };
};

/**
 * Increment rate limit counter
 * @param {Object} obj - Object tracking attempts
 * @param {string} field - Field to increment
 */
const incrementRateLimit = (obj, field) => {
  const resetField = `${field}Reset`;
  if (typeof obj[field] !== 'number') {
    obj[field] = 0;
  }
  if (!obj[resetField]) {
    obj[resetField] = new Date();
  }
  obj[field] = (obj[field] || 0) + 1;
};

module.exports = {
  generateSecureToken,
  hashToken,
  verifyToken,
  generateOTP,
  getTokenExpiration,
  isTokenExpired,
  generateVerificationToken,
  generatePasswordResetToken,
  generate2FAOTP,
  checkRateLimit,
  incrementRateLimit
};
