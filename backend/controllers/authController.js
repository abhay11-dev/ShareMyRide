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
const smsService = require('../services/smsService');
const { encrypt, decrypt } = require('../utils/encryption');

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
    const { name, email, phone, password, confirmPassword, verificationMethod } = req.body;
    
    console.log('📝 Signup request:', { name, email, phone, verificationMethod });

    // ===== VALIDATION =====
    if (!name || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Name, password, and confirmation are required'
      });
    }

    // Require email or phone based on verification method
    if (verificationMethod === 'email' && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for email verification'
      });
    }

    if (verificationMethod === 'phone' && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for phone verification'
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

    // Email validation regex (only validate if email is provided)
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    // ===== CHECK EMAIL UNIQUENESS (only if email is provided) =====
    let user = null;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
      
      if (user && user.emailVerified) {
        console.log('❌ Email already registered and verified:', email);
        return res.status(409).json({
          success: false,
          message: 'Email already registered. Please login or use a different email.'
        });
      }
    }

    // ===== GENERATE EMAIL VERIFICATION TOKEN =====
    // Dev mode: use fixed OTP 111005 for test account
    let token, hashedToken, expiry;
    if (process.env.NODE_ENV === 'development' && email === 'abhayrajsinghmandloi@gmail.com') {
      token = '111005';
      hashedToken = await require('bcryptjs').hash('111005', 10);
      expiry = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
      console.log('🧪 [DEV TEST] Using fixed OTP 111005 for test account');
    } else {
      const result = await generateVerificationToken(15);
      token = result.token;
      hashedToken = result.hashedToken;
      expiry = result.expiry;
    }

    if (!user) {
      // Create new user with pending verification status
      const newUser = {
        name: name.trim(),
        email: email ? email.toLowerCase().trim() : undefined,
        password,
        accountStatus: 'PENDING_EMAIL_VERIFICATION',
        emailVerified: false,
        emailVerificationToken: undefined,
        emailVerificationExpire: undefined,
        phone: phone ? phone.trim() : undefined,
        phoneVerified: false,
        phoneVerificationToken: undefined,
        phoneVerificationExpire: undefined,
        loginAttempts: 0,
        twoFAAttempts: 0
      };

      // Attach tokens according to chosen method
      if (verificationMethod === 'phone' && phone) {
        newUser.phoneVerificationToken = hashedToken;
        newUser.phoneVerificationExpire = expiry;
      } else if (verificationMethod === 'email' && email) {
        newUser.emailVerificationToken = hashedToken;
        newUser.emailVerificationExpire = expiry;
      }

      user = await User.create(newUser);
      console.log('✅ New user created (pending verification):', user.phone || user.email);
    } else {
      // Update existing unverified user with new token
      user.name = name.trim();
      user.password = password;
      user.accountStatus = 'PENDING_EMAIL_VERIFICATION';
      
      if (verificationMethod === 'phone' && phone) {
        user.phone = phone.trim();
        user.phoneVerificationToken = hashedToken;
        user.phoneVerificationExpire = expiry;
      } else if (verificationMethod === 'email' && email) {
        user.email = email.toLowerCase().trim();
        user.emailVerificationToken = hashedToken;
        user.emailVerificationExpire = expiry;
      }
      await user.save();
      console.log('✅ Updated unverified user:', user.phone || user.email);
    }

    // DEV: log plaintext verification code for local testing
    const contact = verificationMethod === 'phone' ? user.phone : user.email;
    console.log('DEV: Verification code for', contact, '=', token);

    // ===== SEND VERIFICATION (EMAIL or SMS) =====
    try {
      if (verificationMethod === 'phone' && user.phone) {
        await smsService.sendSignupVerificationSMS(user.phone, user.name, token);
        console.log('📱 Verification SMS sent to:', user.phone);
      } else {
        await emailService.sendSignupVerificationEmail(user.email, user.name, token);
        console.log('📧 Verification email sent to:', user.email);
      }
    } catch (sendError) {
      console.error('⚠️ Verification send failed:', sendError.message);
      // Continue - user can resend
    }

    res.status(201).json({
      success: true,
      message: '✅ Signup successful! Please check your chosen contact to verify your account.',
      requiresVerification: true,
      availableMethods: [user.email ? 'email' : null, user.phone ? 'phone' : null].filter(Boolean),
      contact: verificationMethod === 'phone' ? user.phone : user.email
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
    const { email, token, method, phone } = req.body;

    console.log('🔐 Verification attempt:', { email, phone, method });

    if ((!email && !phone) || !token) {
      return res.status(400).json({
        success: false,
        message: 'Contact (email or phone) and verification token are required'
      });
    }

    // ===== FIND USER =====
    const user = email ? await User.findOne({ email: email.toLowerCase() }) : await User.findOne({ phone: phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine which verification is being performed
    if (method === 'phone') {
      if (user.phoneVerified) {
        return res.status(400).json({ success: false, message: 'Phone already verified' });
      }

      if (!user.phoneVerificationToken || !user.phoneVerificationExpire) {
        return res.status(400).json({ success: false, message: 'No verification token found. Please request a new one.' });
      }

      if (isTokenExpired(user.phoneVerificationExpire)) {
        user.phoneVerificationToken = undefined;
        user.phoneVerificationExpire = undefined;
        await user.save();
        return res.status(400).json({ success: false, message: 'Verification token expired. Please request a new one.' });
      }

      // Dev mode: accept test OTP
      let isValid = false;
      if (process.env.NODE_ENV === 'development' && token === '111005') {
        isValid = true;
        console.log('🧪 [DEV TEST] Accepted test OTP 111005');
      } else {
        isValid = await verifyToken(token, user.phoneVerificationToken);
      }
      if (!isValid) return res.status(401).json({ success: false, message: 'Invalid verification token' });

      user.phoneVerified = true;
      user.phoneVerificationToken = undefined;
      user.phoneVerificationExpire = undefined;
      user.accountStatus = 'ACTIVE';
      await user.save();

      console.log('✅ Phone verified successfully:', user.phone);
      return res.status(200).json({ success: true, message: '✅ Phone verified successfully! You can now login.', accountActive: true });
    }

    // Default: email verification
    if (user.emailVerified) return res.status(400).json({ success: false, message: 'Email already verified' });
    if (!user.emailVerificationToken || !user.emailVerificationExpire) return res.status(400).json({ success: false, message: 'No verification token found. Please request a new one.' });
    if (isTokenExpired(user.emailVerificationExpire)) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save();
      return res.status(400).json({ success: false, message: 'Verification token expired. Please request a new one.' });
    }

    const isValidToken = await verifyToken(token, user.emailVerificationToken);
    if (!isValidToken) {
      // Dev mode: accept test OTP
      if (process.env.NODE_ENV === 'development' && token === '111005') {
        console.log('🧪 [DEV TEST] Accepted test OTP 111005');
      } else {
        return res.status(401).json({ success: false, message: 'Invalid verification token' });
      }
    }

    user.emailVerified = true;
    user.accountStatus = 'ACTIVE';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    console.log('✅ Email verified successfully:', user.email);
    res.status(200).json({ success: true, message: '✅ Email verified successfully! You can now login.', accountActive: true });

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
    const { email, method, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone is required'
      });
    }

    const user = email ? await User.findOne({ email: email.toLowerCase() }) : await User.findOne({ phone: phone });

    if (!user) {
      // Security: Don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: '📧 If the email exists, verification link has been sent'
      });
    }

    // Check if already verified based on method
    if (method === 'phone' && user.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone already verified. Please login.'
      });
    }

    if (method !== 'phone' && user.emailVerified) {
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

    if (method === 'phone' && user.phone) {
      user.phoneVerificationToken = hashedToken;
      user.phoneVerificationExpire = expiry;
    } else {
      user.emailVerificationToken = hashedToken;
      user.emailVerificationExpire = expiry;
    }
    await user.save();

    // ===== SEND =====
    try {
      if (method === 'phone' && user.phone) {
        await smsService.sendSignupVerificationSMS(user.phone, user.name, token);
        console.log('📱 Verification SMS resent to:', user.phone);
      } else {
        await emailService.sendSignupVerificationEmail(user.email, user.name, token);
        console.log('📧 Verification email resent to:', user.email);
      }
    } catch (sendError) {
      console.error('⚠️ Verification sending failed:', sendError.message);
    }

    res.status(200).json({
      success: true,
      message: '✅ Verification resent'
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
    const { email, phone, password } = req.body;
    
    console.log('🔐 Login request:', { email, phone });

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone and password are required'
      });
    }

    // ===== FIND USER WITH PASSWORD =====
    const query = email ? { email: email.toLowerCase() } : { phone };
    const user = await User.findOne(query).select('+password');

    if (!user) {
      console.log('❌ User not found:', email || phone);
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials'
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

    // Require verification by either email or phone
    if (!user.emailVerified && !user.phoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your account via email or phone first',
        requiresVerification: true,
        availableMethods: [user.email ? 'email' : null, user.phone ? 'phone' : null].filter(Boolean)
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
    let isPasswordMatch = false;
    
    // Dev mode: accept test password for test account
    if (process.env.NODE_ENV === 'development' && email === 'abhayrajsinghmandloi@gmail.com' && password === 'Abhay@11') {
      isPasswordMatch = true;
      console.log('🧪 [DEV TEST] Accepted test password for test account');
    } else {
      isPasswordMatch = await user.comparePassword(password);
    }

    if (!isPasswordMatch) {
      incrementRateLimit(user, 'loginAttempts');
      const attempts = user.loginAttempts?.count || 1;
      await user.save();

      console.log('❌ Invalid password for user:', email || phone, `(${attempts} attempts)`);

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        attemptsRemaining: LOGIN_RATE_LIMIT - attempts
      });
    }

    // ===== RESET LOGIN ATTEMPTS =====
    user.loginAttempts = 0;
    user.lastLoginAt = new Date();

    // Determine available methods
    const availableMethods = [];
    if (user.email) availableMethods.push('email');
    if (user.phone) availableMethods.push('phone');

    // ===== GENERATE 2FA OTP =====
    const { otp, hashedOTP, expiry } = await generate2FAOTP(10);

    user.twoFAOTP = hashedOTP;
    user.twoFAOTPExpire = expiry;
    user.twoFAAttempts = 0;
    await user.save();

    // DEV: log plaintext 2FA code for local testing
    console.log('DEV: 2FA OTP for', user.email, '=', otp);

    // If client requested phone method, try SMS
    const method = req.body.method;
    try {
      if (method === 'phone' && user.phone) {
        await smsService.send2FASMS(user.phone, user.name, otp);
        console.log('📱 2FA OTP sent to:', user.phone);
      } else {
        await emailService.send2FAEmail(user.email, user.name, otp);
        console.log('📧 2FA OTP sent to:', user.email);
      }
    } catch (sendErr) {
      console.error('⚠️ 2FA sending failed:', sendErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent. Please verify to login.',
      requires2FA: true,
      availableMethods,
      contact: method === 'phone' && user.phone ? user.phone : user.email,
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

    // Mask sensitive aadhar field in response
    const publicUser = user.toObject();
    delete publicUser.aadharEncrypted;
    if (publicUser.aadharMasked) {
      publicUser.aadhar = { masked: publicUser.aadharMasked, status: publicUser.aadharVerificationStatus };
    } else {
      publicUser.aadhar = { masked: null, status: publicUser.aadharVerificationStatus };
    }

    // Reputation grouping
    publicUser.reputation = {
      overallRating: publicUser.overallRating || 0,
      ridesAsDriver: publicUser.ridesAsDriver || 0,
      ridesAsPassenger: publicUser.ridesAsPassenger || 0
    };

    // Remove internal fields
    delete publicUser.overallRating;
    delete publicUser.ridesAsDriver;
    delete publicUser.ridesAsPassenger;
    delete publicUser.aadharMasked;
    delete publicUser.aadharVerificationStatus;

    res.status(200).json({ success: true, user: publicUser });

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
    const { avatarUrl, gender, age, homeCity } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Immutable identity fields: name, email, phone cannot be changed via this endpoint

    // Validation
    if (age !== undefined && age !== null) {
      const numericAge = Number(age);
      if (Number.isNaN(numericAge) || numericAge < 18) {
        return res.status(400).json({ success: false, message: 'Age must be a number and at least 18' });
      }
      user.age = numericAge;
    }

    if (gender !== undefined) {
      const allowed = ['Male', 'Female', 'Other', 'Prefer not to say'];
      if (gender && !allowed.includes(gender)) {
        return res.status(400).json({ success: false, message: 'Invalid gender value' });
      }
      user.gender = gender || 'Prefer not to say';
    }

    if (homeCity !== undefined) user.homeCity = homeCity || '';
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || null;

    user.updatedAt = new Date();
    await user.save();

    console.log('✅ Profile updated for:', user.email);

    const publicUser = user.toObject();
    delete publicUser.aadharEncrypted;
    publicUser.aadhar = { masked: publicUser.aadharMasked, status: publicUser.aadharVerificationStatus };

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: publicUser });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// @desc    Submit Aadhar for verification
// @route   POST /api/auth/profile/aadhar
// @access  Private
exports.submitAadhar = async (req, res) => {
  try {
    const { aadharNumber, documentUrl } = req.body;

    if (!aadharNumber || typeof aadharNumber !== 'string') {
      return res.status(400).json({ success: false, message: 'Aadhar number is required' });
    }

    // Basic validation: digits only, length 12 (India Aadhaar)
    const digitsOnly = aadharNumber.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return res.status(400).json({ success: false, message: 'Please provide a valid Aadhar number' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Mask aadhar: keep last 4 digits, mask rest
    const masked = digitsOnly.length >= 4 ? `**** **** ${digitsOnly.slice(-4)}` : `**** ${digitsOnly}`;

    // Encrypt the full value for storage
    let encrypted;
    try {
      encrypted = encrypt(digitsOnly);
    } catch (err) {
      console.error('❌ Encryption failed:', err.message);
      return res.status(500).json({ success: false, message: 'Server encryption error' });
    }

    user.aadharEncrypted = encrypted;
    user.aadharMasked = masked;
    user.aadharDocumentUrl = documentUrl || user.aadharDocumentUrl;
    user.aadharVerificationStatus = 'pending';
    user.aadharVerified = false;

    await user.save();

    // Return refreshed public profile
    const publicUser = user.toObject();
    delete publicUser.aadharEncrypted;
    publicUser.aadhar = { masked: publicUser.aadharMasked, status: publicUser.aadharVerificationStatus };

    res.status(200).json({ success: true, message: 'Aadhar submitted for verification', user: publicUser });
  } catch (error) {
    console.error('❌ Submit Aadhar error:', error);
    res.status(500).json({ success: false, message: 'Server error submitting Aadhar' });
  }
};

// @desc    Admin: verify or reject a user's Aadhar
// @route   POST /api/auth/profile/aadhar/verify
// @access  Private/Admin
exports.adminVerifyAadhar = async (req, res) => {
  try {
    const { userId, action, reason } = req.body; // action = 'approve' | 'reject'

    if (!userId || !action) return res.status(400).json({ success: false, message: 'userId and action are required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (action === 'approve') {
      user.aadharVerified = true;
      user.aadharVerificationStatus = 'verified';
    } else {
      user.aadharVerified = false;
      user.aadharVerificationStatus = 'rejected';
    }

    // Optionally store admin note (non-sensitive)
    user.aadharAdminNote = reason || '';

    await user.save();

    console.log(`✅ Aadhar ${action} for user: ${user.email} by admin ${req.user.email}`);

    const publicUser = user.toObject();
    delete publicUser.aadharEncrypted;
    publicUser.aadhar = { masked: publicUser.aadharMasked, status: publicUser.aadharVerificationStatus };

    res.status(200).json({ success: true, message: `Aadhar ${action}d`, user: publicUser });
  } catch (error) {
    console.error('❌ Admin verify Aadhar error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};