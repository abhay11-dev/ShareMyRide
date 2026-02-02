// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { generateOTP, getOTPExpiration, isOTPExpired } = require('../utils/otpHelper');
const emailService = require('../services/emailService');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user (Step 1: Create account & send OTP)
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log('📝 Signup request:', { name, email });

    // Validation
    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user && user.isVerified) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpire = getOTPExpiration();

    if (!user) {
      // Create new user (not verified yet)
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        isVerified: false,
        verificationToken: otp,
        verificationTokenExpire: otpExpire
      });
      console.log('✅ New user created:', user.email);
    } else {
      // Update existing unverified user
      user.name = name.trim();
      user.password = password;
      user.verificationToken = otp;
      user.verificationTokenExpire = otpExpire;
      await user.save();
      console.log('✅ Updated unverified user:', user.email);
    }

    // Send verification email
    await emailService.sendSignupVerificationEmail(user.email, user.name, otp);

    res.status(201).json({
      success: true,
      message: '📧 Verification email sent! Please check your inbox.',
      email: user.email,
      requiresVerification: true
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
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
      message: error.message || 'Server error during signup'
    });
  }
};

// @desc    Verify email OTP for signup (Step 2)
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('🔐 Email verification attempt:', email);

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Check if OTP is expired
    if (!user.verificationTokenExpire || isOTPExpired(user.verificationTokenExpire)) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (user.verificationToken !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    console.log('✅ Email verified:', user.email);

    res.status(200).json({
      success: true,
      message: '✅ Email verified successfully! You can now login.'
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during verification'
    });
  }
};

// @desc    Resend verification OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpire = getOTPExpiration();

    user.verificationToken = otp;
    user.verificationTokenExpire = otpExpire;
    await user.save();

    // Send email
    await emailService.sendSignupVerificationEmail(user.email, user.name, otp);

    console.log('✅ OTP resent to:', user.email);

    res.status(200).json({
      success: true,
      message: '📧 OTP resent to your email'
    });

  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error resending OTP'
    });
  }
};

// @desc    Login user - Request 2FA
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login request:', { email });

    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        requiresEmailVerification: true,
        email: user.email
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate 2FA OTP
    const otp = generateOTP();
    const otpExpire = getOTPExpiration();

    user.twoFAOTP = otp;
    user.twoFAOTPExpire = otpExpire;
    await user.save();

    // Send 2FA email
    await emailService.send2FAEmail(user.email, user.name, otp);

    console.log('✅ 2FA OTP sent to:', user.email);

    res.status(200).json({
      success: true,
      message: '📧 2FA code sent to your email',
      requires2FA: true,
      email: user.email,
      userId: user._id
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
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

    // Check if OTP is expired
    if (!user.twoFAOTPExpire || isOTPExpired(user.twoFAOTPExpire)) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please login again.'
      });
    }

    // Verify OTP
    if (user.twoFAOTP !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Clear OTP
    user.twoFAOTP = undefined;
    user.twoFAOTPExpire = undefined;
    await user.save();

    // Generate token
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
        role: user.role || 'user',
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during 2FA verification'
    });
  }
};

// @desc    Forgot password - Send OTP
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

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.status(200).json({
        success: true,
        message: '📧 If email exists, password reset link has been sent'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpire = getOTPExpiration();

    user.resetOTP = otp;
    user.resetOTPExpire = otpExpire;
    await user.save();

    // Send email
    await emailService.sendPasswordResetEmail(user.email, user.name, otp);

    console.log('✅ Password reset OTP sent to:', user.email);

    res.status(200).json({
      success: true,
      message: '📧 Password reset code sent to your email'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during password reset request'
    });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    console.log('🔐 Reset password attempt:', email);

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and passwords are required'
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

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP is expired
    if (!user.resetOTPExpire || isOTPExpired(user.resetOTPExpire)) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (user.resetOTP !== otp) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;
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
      message: error.message || 'Server error during password reset'
    });
  }
};

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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();

    await user.save();

    console.log('✅ Profile updated for:', user.email);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile'
    });
  }
};