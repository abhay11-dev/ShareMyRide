// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const {
  generateVerificationToken,
  generatePasswordResetToken,
  generate2FAOTP,
  verifyToken,
  isTokenExpired,
  checkRateLimit,
  incrementRateLimit
} = require('../utils/tokenHelper');
const emailService = require('../services/emailService');

// ========== CONFIGURATION ==========
const LOGIN_RATE_LIMIT = 5;        // Max login attempts
const OTP_RATE_LIMIT = 3;          // Max OTP attempts for 2FA
const VERIFICATION_RATE_LIMIT = 5; // Max verification resend attempts
const RATE_LIMIT_WINDOW = 15;      // Minutes

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ========== SIGNUP FLOW ==========
// @desc    Register a new user with email verification
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    
    console.log('📝 Signup request:', { name, email });

    // ===== VALIDATION =====
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Email validation regex
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    // ===== CHECK EMAIL UNIQUENESS =====
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user && user.emailVerified) {
      console.log('❌ Email already registered and verified:', email);
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login or use a different email.'
      });
    }

    // ===== GENERATE EMAIL VERIFICATION TOKEN =====
    const { token, hashedToken, expiry } = await generateVerificationToken(15);

    if (!user) {
      // Create new user with PENDING_EMAIL_VERIFICATION status
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        accountStatus: 'PENDING_EMAIL_VERIFICATION',
        emailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpire: expiry,
        loginAttempts: 0,
        twoFAAttempts: 0
      });
      console.log('✅ New user created (pending verification):', user.email);
    } else {
      // Update existing unverified user with new token
      user.name = name.trim();
      user.password = password;
      user.accountStatus = 'PENDING_EMAIL_VERIFICATION';
      user.emailVerificationToken = hashedToken;
      user.emailVerificationExpire = expiry;
      await user.save();
      console.log('✅ Updated unverified user:', user.email);
    }

    // DEV: log plaintext verification code for local testing
    console.log('DEV: Email verification code for', user.email, '=', token);

    // ===== SEND VERIFICATION EMAIL =====
    try {
      await emailService.sendSignupVerificationEmail(
        user.email,
        user.name,
        token  // Send plaintext token to user
      );
      console.log('📧 Verification email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError.message);
      // Continue - user can resend
    }

    res.status(201).json({
      success: true,
      message: '✅ Signup successful! Please check your email to verify your account.',
      requiresEmailVerification: true,
      email: user.email
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already in use'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during signup'
    });
  }
};

// @desc    Verify email with token
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    console.log('🔐 Email verification attempt:', email);

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification token are required'
      });
    }

    // ===== FIND USER =====
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // ===== VALIDATE TOKEN =====
    if (!user.emailVerificationToken || !user.emailVerificationExpire) {
      return res.status(400).json({
        success: false,
        message: 'No verification token found. Please request a new one.'
      });
    }

    if (isTokenExpired(user.emailVerificationExpire)) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: 'Verification token expired. Please request a new one.'
      });
    }

    // ===== VERIFY TOKEN =====
    const isValidToken = await verifyToken(token, user.emailVerificationToken);

    if (!isValidToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // ===== UPDATE USER STATUS =====
    user.emailVerified = true;
    user.accountStatus = 'ACTIVE';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    console.log('✅ Email verified successfully:', user.email);

    res.status(200).json({
      success: true,
      message: '✅ Email verified successfully! You can now login.',
      accountActive: true
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Security: Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: '📧 If the email exists, verification link has been sent'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified. Please login.'
      });
    }

    // ===== RATE LIMITING =====
    const rateCheck = checkRateLimit(
      user,
      'resendAttempts',
      VERIFICATION_RATE_LIMIT,
      RATE_LIMIT_WINDOW
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateCheck.message
      });
    }

    incrementRateLimit(user, 'resendAttempts');

    // ===== GENERATE NEW TOKEN =====
    const { token, hashedToken, expiry } = await generateVerificationToken(15);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpire = expiry;
    await user.save();

    // ===== SEND EMAIL =====
    try {
      await emailService.sendSignupVerificationEmail(user.email, user.name, token);
      console.log('📧 Verification email resent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: '📧 Verification email resent'
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ========== LOGIN FLOW ==========
// @desc    Login user - First step of 2FA flow
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login request:', { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // ===== FIND USER WITH PASSWORD =====
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ===== CHECK ACCOUNT STATUS =====
    if (user.accountStatus === 'LOCKED') {
      if (user.loginLockedUntil && new Date() < user.loginLockedUntil) {
        const minutesLeft = Math.ceil((user.loginLockedUntil - new Date()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes.`
        });
      } else if (user.loginLockedUntil && new Date() >= user.loginLockedUntil) {
        user.accountStatus = 'ACTIVE';
        user.loginAttempts = 0;
        user.loginLocked = false;
        user.loginLockedUntil = undefined;
        await user.save();
      }
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    // ===== RATE LIMITING =====
    const rateCheck = checkRateLimit(
      user,
      'loginAttempts',
      LOGIN_RATE_LIMIT,
      RATE_LIMIT_WINDOW
    );

    if (!rateCheck.allowed) {
      // Lock account
      user.accountStatus = 'LOCKED';
      user.loginLocked = true;
      user.loginLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();

      return res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Account locked for 30 minutes.'
      });
    }

    // ===== VERIFY PASSWORD =====
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      incrementRateLimit(user, 'loginAttempts');
      const attempts = user.loginAttempts?.count || 1;
      await user.save();

      console.log('❌ Invalid password for user:', email, `(${attempts} attempts)`);

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        attemptsRemaining: LOGIN_RATE_LIMIT - attempts
      });
    }

    // ===== RESET LOGIN ATTEMPTS =====
    user.loginAttempts = 0;
    user.lastLoginAt = new Date();

    // ===== GENERATE 2FA OTP =====
    const { otp, hashedOTP, expiry } = await generate2FAOTP(10);

    user.twoFAOTP = hashedOTP;
    user.twoFAOTPExpire = expiry;
    user.twoFAAttempts = 0;
    await user.save();

    // DEV: log plaintext 2FA code for local testing
    console.log('DEV: 2FA OTP for', user.email, '=', otp);

    // ===== SEND 2FA OTP EMAIL =====
    try {
      await emailService.send2FAEmail(user.email, user.name, otp);
      console.log('📧 2FA OTP sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: '📧 OTP sent to your email. Please verify to login.',
      requires2FA: true,
      email: user.email,
      userId: user._id
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Verify 2FA OTP
// @route   POST /api/auth/verify-2fa
// @access  Public
exports.verify2FA = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    console.log('🔐 2FA verification attempt');

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ===== CHECK 2FA CHALLENGE EXISTS =====
    if (!user.twoFAOTP || !user.twoFAOTPExpire) {
      return res.status(400).json({
        success: false,
        message: 'No active 2FA challenge. Please login again.'
      });
    }

    // ===== CHECK EXPIRY =====
    if (isTokenExpired(user.twoFAOTPExpire)) {
      user.twoFAOTP = undefined;
      user.twoFAOTPExpire = undefined;
      user.twoFAAttempts = 0;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please login again.'
      });
    }

    // ===== CHECK ATTEMPT LIMIT =====
    if (user.twoFAAttempts >= OTP_RATE_LIMIT) {
      // Lock account
      user.twoFALocked = true;
      user.twoFALockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      user.twoFAOTP = undefined;
      user.twoFAOTPExpire = undefined;
      user.twoFAAttempts = 0;
      await user.save();

      return res.status(429).json({
        success: false,
        message: 'Too many OTP attempts. Please try login again later.'
      });
    }

    // ===== VERIFY OTP =====
    const isValidOTP = await verifyToken(otp, user.twoFAOTP);

    if (!isValidOTP) {
      user.twoFAAttempts += 1;
      await user.save();

      const attemptsRemaining = OTP_RATE_LIMIT - user.twoFAAttempts;

      console.log('❌ Invalid OTP for user:', user.email, `(${user.twoFAAttempts} attempts)`);

      return res.status(401).json({
        success: false,
        message: 'Invalid OTP',
        attemptsRemaining
      });
    }

    // ===== CLEAR 2FA CHALLENGE =====
    user.twoFAOTP = undefined;
    user.twoFAOTPExpire = undefined;
    user.twoFAAttempts = 0;
    user.twoFALocked = false;
    user.twoFALockedUntil = undefined;
    await user.save();

    // ===== GENERATE JWT TOKEN =====
    const token = generateToken(user._id);

    console.log('✅ 2FA verified, login successful:', user.email);

    res.status(200).json({
      success: true,
      message: '✅ Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA verification'
    });
  }
};

// ========== FORGOT PASSWORD FLOW ==========
// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔐 Forgot password request:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // ===== SECURITY: Always return success (don't leak if email exists) =====
    if (!user) {
      return res.status(200).json({
        success: true,
        message: '📧 If the email exists, a password reset link has been sent'
      });
    }

    // ===== GENERATE PASSWORD RESET OTP (numeric 6-digit) =====
    const { otp, hashedOTP, expiry } = await generate2FAOTP(20);

    user.passwordResetToken = hashedOTP;
    user.passwordResetExpire = expiry;
    await user.save();

    // DEV: log plaintext password reset OTP for local testing
    console.log('DEV: Password reset OTP for', user.email, '=', otp);

    // ===== SEND PASSWORD RESET EMAIL (sends numeric OTP) =====
    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, otp);
      console.log('📧 Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: '📧 If the email exists, a password reset code has been sent'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    console.log('🔐 Reset password attempt:', email);

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // ===== FIND USER =====
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ===== VALIDATE RESET OTP =====
    if (!user.passwordResetToken || !user.passwordResetExpire) {
      return res.status(400).json({
        success: false,
        message: 'No password reset code found. Please request a new one.'
      });
    }

    if (isTokenExpired(user.passwordResetExpire)) {
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Password reset code expired. Please request a new one.'
      });
    }

    // ===== VERIFY OTP =====
    const isValidOTP = await verifyToken(otp, user.passwordResetToken);

    if (!isValidOTP) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    // ===== UPDATE PASSWORD & INVALIDATE ALL SESSIONS =====
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    user.twoFAOTP = undefined;
    user.twoFAOTPExpire = undefined;
    await user.save();

    console.log('✅ Password reset successful:', user.email);

    res.status(200).json({
      success: true,
      message: '✅ Password reset successful! Please login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ========== PROFILE ENDPOINTS ==========
// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Profile retrieved for:', user.email);

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    console.log('✅ Profile updated for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};