// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  signup,
  verifyEmail,
  resendOTP,
  login,
  verify2FA,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Public Routes
router.post('/signup', signup);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/verify-2fa', verify2FA);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;