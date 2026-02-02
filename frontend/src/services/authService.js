import api from '../config/api';

/**
 * Signup user (Step 1: Create account & send verification OTP)
 * @param {Object} userData - {name, email, password}
 * @returns {Promise<Object>} - {email, requiresVerification}
 */
export const signupUser = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

/**
 * Verify email with OTP (Step 2: Verify and then ready to login)
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<Object>} - {success, message}
 */
export const verifyEmail = async (email, otp) => {
  const response = await api.post('/auth/verify-email', { email, otp });
  return response.data;
};

/**
 * Resend OTP
 * @param {string} email
 * @returns {Promise<Object>} - {success, message}
 */
export const resendOTP = async (email) => {
  const response = await api.post('/auth/resend-otp', { email });
  return response.data;
};

/**
 * Login user - Triggers 2FA
 * @param {Object} credentials - {email, password}
 * @returns {Promise<Object>} - {requires2FA, email, userId, message}
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Verify 2FA OTP
 * @param {string} userId
 * @param {string} otp
 * @returns {Promise<Object>} - {token, user}
 */
export const verify2FA = async (userId, otp) => {
  const response = await api.post('/auth/verify-2fa', { userId, otp });
  return response.data;
};

/**
 * Forgot password - Request OTP
 * @param {string} email
 * @returns {Promise<Object>} - {success, message}
 */
export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Reset password with OTP
 * @param {Object} data - {email, otp, newPassword, confirmPassword}
 * @returns {Promise<Object>} - {success, message}
 */
export const resetPassword = async (data) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};

/**
 * Get current user profile
 * @returns {Promise<Object>} - User data
 */
export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

/**
 * Logout user (client-side cleanup)
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
};