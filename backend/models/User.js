// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'driver', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  // ========== EMAIL VERIFICATION ==========
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,    // Hashed token
  emailVerificationExpire: Date,
  
  // ========== PASSWORD RESET ==========
  passwordResetToken: String,        // Hashed token
  passwordResetExpire: Date,
  
  // ========== 2FA SETUP ==========
  twoFAEnabled: {
    type: Boolean,
    default: false
  },
  twoFASecret: String,               // For TOTP (future: authenticator app)
  
  // ========== 2FA LOGIN FLOW ==========
  twoFAOTP: String,                  // Hashed OTP
  twoFAOTPExpire: Date,
  twoFAAttempts: {
    type: Number,
    default: 0
  },
  twoFALocked: {
    type: Boolean,
    default: false
  },
  twoFALockedUntil: Date,
  
  // ========== LOGIN SECURITY ==========
  loginAttempts: {
    type: Number,
    default: 0
  },
  loginLocked: {
    type: Boolean,
    default: false
  },
  loginLockedUntil: Date,
  lastLoginAt: Date,
  
  // ========== ACCOUNT STATUS ==========
  accountStatus: {
    type: String,
    enum: ['PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'LOCKED', 'SUSPENDED'],
    default: 'PENDING_EMAIL_VERIFICATION'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('🔒 Password hashed for user:', this.email);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔑 Password comparison:', isMatch ? 'MATCH ✅' : 'NO MATCH ❌');
    return isMatch;
  } catch (error) {
    console.error('❌ Error comparing passwords:', error);
    throw error;
  }
};

// Method to get public user data (without sensitive info)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpire;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpire;
  delete user.twoFAOTP;
  delete user.twoFAOTPExpire;
  delete user.twoFASecret;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;