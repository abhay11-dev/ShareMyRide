// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  signup,
  verifyEmail,
  resendVerificationEmail,
  login,
  verify2FA,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  submitAadhar,
  adminVerifyAadhar
} = require('../controllers/authController');

const { protect, authorize } = require('../middleware/auth');

// Public Routes
router.post('/signup', signup);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/login', login);
router.post('/verify-2fa', verify2FA);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
// Aadhar endpoints
router.post('/profile/aadhar', protect, submitAadhar);
router.post('/profile/aadhar/verify', protect, authorize('admin'), adminVerifyAadhar);

module.exports = router;