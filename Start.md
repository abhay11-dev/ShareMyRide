# ShareMyRide - Project Documentation

## 📋 Project Overview

**ShareMyRide** is a full-stack carpooling application designed to connect drivers and passengers, enabling cost-effective and environmentally friendly ride-sharing. Users can post rides, search for available rides, manage bookings, and handle payments through an integrated payment gateway.

**Current Status**: Authentication & 2FA system is production-ready with email verification, password security, and multi-factor authentication implemented.

---

## 🏗️ System Architecture

### Tech Stack

**Frontend:**
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: Context API (UserContext)
- **HTTP Client**: Axios
- **Notifications**: Custom Toast Utility
- **Components**: Reusable, modular component structure

**Backend:**
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) + 2FA OTP
- **Email Service**: Nodemailer for OTP delivery
- **Payment Gateway**: Razorpay integration
- **Password Hashing**: bcryptjs for secure password storage
- **Middleware**: Custom auth middleware for route protection

**Infrastructure:**
- **Environment**: Windows development environment
- **Port**: Backend (5000), Frontend (5173 via Vite)

---

## 🔐 Authentication & 2FA Workflow

### 1. **Signup Flow**
```
User Registration → Email Verification OTP → Account Created → Ready to Login
```

**Process:**
1. User fills signup form (name, email, password, confirm password)
2. Password validation (min 6 characters, strength indicator)
3. Backend creates user with `emailVerified: false` status
4. Verification OTP sent to email (15-minute expiry)
5. User enters 6-digit OTP code
6. Account marked as verified and active
7. User can proceed to login

**Key Fields in User Model:**
```javascript
{
  emailVerified: Boolean,
  emailVerificationToken: String (hashed),
  emailVerificationExpire: Date,
  accountStatus: ['PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'LOCKED', 'SUSPENDED']
}
```

### 2. **Login Flow**
```
Credentials Submit → Password Verification → 2FA OTP Generation → OTP Entry → Token Generation → Dashboard Access
```

**Process:**
1. User enters email and password
2. Backend verifies credentials against stored hashed password
3. If valid:
   - Login attempts counter reset to 0
   - 6-digit 2FA OTP generated (10-minute expiry)
   - OTP hashed and stored in database
   - OTP sent via email
   - Frontend transitions to "2fa" step
4. User receives OTP on registered email
5. User enters 6-digit OTP
6. Backend verifies OTP against stored hash
7. JWT token generated (contains userId, email, role)
8. User data and token stored in localStorage
9. Welcome toast message displays: "👋 Welcome {username}!"
10. User redirected to main dashboard (/)

**Security Features:**
- **Password Security**: Passwords hashed with bcryptjs (salt rounds: 10)
- **2FA OTP**: 6-digit random code with SHA-256 hashing
- **Token Security**: JWT with expiry time
- **Rate Limiting**: Login attempt counter prevents brute force
- **HTTPS Ready**: Token-based authentication supports HTTPS

### 3. **Session Management**
```
Token Storage → Session Validation → Auto-login on Page Refresh → Logout Clears Storage
```

**Process:**
1. On login success:
   - JWT token stored in localStorage
   - User data stored in localStorage
2. On page refresh:
   - App checks localStorage for token and user data
   - Validates user object has id/email
   - Automatically restores session
3. On logout:
   - Token and user data cleared from localStorage
   - User redirected to login page

---

## 🗄️ User Model Schema

```javascript
{
  // Basic Info
  name: String (2-50 chars),
  email: String (unique, lowercase),
  password: String (hashed, 6+ chars),
  role: String (enum: 'user', 'driver', 'admin'),
  phone: String,
  avatar: String (URL),
  
  // Email Verification
  emailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // Password Reset (future feature)
  passwordResetToken: String,
  passwordResetExpire: Date,
  
  // 2FA Setup
  twoFAEnabled: Boolean,
  twoFASecret: String,
  
  // 2FA Login Flow
  twoFAOTP: String (hashed),
  twoFAOTPExpire: Date,
  twoFAAttempts: Number,
  twoFALocked: Boolean,
  twoFALockedUntil: Date,
  
  // Security
  loginAttempts: Number (reset after successful login),
  loginLocked: Boolean,
  loginLockedUntil: Date,
  lastLoginAt: Date,
  
  // Status
  accountStatus: Enum ['PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'LOCKED', 'SUSPENDED'],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📁 Project Structure

```
ShareMyRide/
├── frontend/                          # React Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/               # Reusable: Header, Footer
│   │   │   ├── ride/                 # Ride-specific: RideCard, RideForm
│   │   │   └── NotificationDropdown.jsx
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx         # 2FA-integrated login
│   │   │   │   ├── Signup.jsx        # Email verification flow
│   │   │   │   └── ForgotPassword.jsx
│   │   │   ├── Home/
│   │   │   │   └── Home.jsx          # Main dashboard
│   │   │   ├── Profile/
│   │   │   ├── RideSearch/
│   │   │   ├── RidePost/
│   │   │   └── bookings/             # Booking management
│   │   ├── contexts/
│   │   │   └── UserContext.jsx       # Global user state
│   │   ├── hooks/
│   │   │   └── useAuth.jsx           # Auth context hook
│   │   ├── services/
│   │   │   └── authService.js        # API calls for auth
│   │   ├── utils/
│   │   │   └── toast.js              # Toast notifications
│   │   └── routes/
│   │       └── AppRoutes.jsx         # Route definitions
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                           # Node.js Express server
│   ├── controllers/
│   │   ├── authController.js         # Login, Signup, 2FA, OTP verification
│   │   ├── userController.js
│   │   ├── rideController.js
│   │   ├── bookingController.js
│   │   └── paymentController.js
│   ├── models/
│   │   ├── User.js                   # User schema with auth fields
│   │   ├── Ride.js
│   │   ├── Booking.js
│   │   └── Payment.js
│   ├── routes/
│   │   ├── authRoutes.js             # /api/auth/* endpoints
│   │   ├── rideRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/
│   │   ├── auth.js                   # JWT verification middleware
│   │   └── authMiddleware.js
│   ├── services/
│   │   ├── emailService.js           # Email sending logic
│   │   ├── payoutService.js
│   │   └── commissionService.js
│   ├── utils/
│   │   ├── otpHelper.js              # OTP generation & verification
│   │   └── tokenHelper.js            # JWT token utilities
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   └── razorpay.js               # Payment gateway config
│   ├── server.js                     # Express app entry point
│   └── package.json
│
└── Start.md                           # This file
```

---

## 🔄 API Endpoints (Authentication)

### User Registration
```
POST /api/auth/signup
Body: { name, email, password, confirmPassword }
Response: { success, message, email, userId }
```

### Email Verification
```
POST /api/auth/verify-email
Body: { email, otp }
Response: { success, message }
```

### Resend OTP
```
POST /api/auth/resend-otp
Body: { email }
Response: { success, message }
```

### Login (Step 1: Credentials)
```
POST /api/auth/login
Body: { email, password }
Response: { 
  success, 
  message, 
  requires2FA: true, 
  userId, 
  email 
}
```

### Verify 2FA (Step 2: OTP Verification)
```
POST /api/auth/verify-2fa
Body: { userId, otp }
Response: { 
  success, 
  message, 
  token (JWT),
  user: { id, email, name, role, ... }
}
```

---

## 🛡️ Security Implementation

| Feature | Implementation |
|---------|-----------------|
| **Password Storage** | bcryptjs with 10 salt rounds |
| **2FA OTP** | 6-digit random code, SHA-256 hashed, 10-min expiry |
| **JWT Token** | Signed token with user claims, httpOnly cookie support |
| **Email Verification** | Hashed verification tokens with 24-hour expiry |
| **Login Protection** | Login attempt counter with lockout mechanism |
| **CORS Security** | Configured for frontend domain only |
| **Input Validation** | Email format, password strength, OTP length checks |
| **Rate Limiting** | Ready for implementation on sensitive endpoints |

---

## 💻 Key Technical Decisions

### 1. **2FA Implementation**
- **Why Email-based OTP?** Simple, no dependency on authenticator apps initially
- **6-digit code**: Standard security balance between security and usability
- **10-minute expiry**: Prevents old OTP reuse, allows time for delivery delays
- **Resend Option**: Users can request new OTP if email delivery fails

### 2. **JWT Authentication**
- **Why JWT?** Stateless, scalable, works well with single-page apps
- **Token Storage**: localStorage (simpler for SPA) vs httpOnly cookies (more secure for API)
- **Current**: localStorage for development, can migrate to httpOnly for production

### 3. **Password Hashing**
- **bcryptjs**: Industry-standard, slow hashing prevents brute force
- **10 Salt Rounds**: Good balance between security and performance
- **Never store**: Plaintext passwords are never stored or logged

### 4. **User Status Management**
- **Account Status**: Tracks verification, active, locked, suspended states
- **Prevents**: Unverified users from logging in
- **Future**: Admin can suspend accounts, automated locking for suspicious activity

---

## 🚀 Current Features

✅ **User Registration with Email Verification**
✅ **Password Security with Strength Indicator**
✅ **2FA OTP-based Login**
✅ **Session Management with localStorage**
✅ **Auto-login on Page Refresh**
✅ **Logout with Session Cleanup**
✅ **Toast Notifications for User Feedback**
✅ **Error Handling & Validation**
✅ **Responsive UI (Mobile & Desktop)**

---

## 🔜 Future Enhancements

- [ ] **Password Reset Flow**: Forgot password with secure token email
- [ ] **TOTP Authentication**: Authenticator app support (Google Authenticator)
- [ ] **Social Login**: Google, GitHub OAuth integration
- [ ] **Rate Limiting**: Prevent brute force attacks
- [ ] **Device Management**: Login from multiple devices, device tracking
- [ ] **Biometric Auth**: Fingerprint/Face ID for mobile
- [ ] **Account Recovery**: Backup codes, recovery email
- [ ] **Security Audit Logs**: Track login attempts, password changes

---

## 📊 Database Schema Relationships

```
User (1) ──── (many) Ride
User (1) ──── (many) Booking
User (1) ──── (many) Payment
User (1) ──── (many) Payout
Ride (1) ──── (many) Booking
Booking (1) ──── (many) Payment
Driver (extends User) ──── (many) DriverBankAccount
```

---

## 🧪 Testing the Auth Flow

### Signup Test
1. Navigate to `/signup`
2. Enter: name, email, password (min 6 chars)
3. Check email for OTP (or console in dev)
4. Enter 6-digit OTP
5. Redirect to `/login` after success

### Login Test
1. Navigate to `/login`
2. Enter registered email & password
3. Check email for 2FA OTP (or console in dev)
4. Enter 6-digit OTP
5. See welcome toast: "👋 Welcome {name}!"
6. Redirect to main dashboard `/`

### Session Persistence
1. Login successfully
2. Refresh page (F5)
3. User should remain logged in
4. Check localStorage for token and user data

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Email and password required" error | Invalid credentials object passed | Ensured proper object structure in verify2FA |
| "Cast to Number failed" for loginAttempts | loginAttempts defined as Number, object assigned | Changed to store only count value (0) |
| OTP not received | Email service not configured | Check SMTP credentials in emailService.js |
| Token not found after login | localStorage cleared | Check browser storage, verify token response |
| 2FA OTP expires | 10-minute window passed | User must request resend OTP |

---

## 📝 Code Examples

### Frontend: Login with 2FA
```javascript
const handleVerify2FA = async (otp) => {
  const result = await verify2FA(userId, otp);
  if (result.token && result.user) {
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    success(`👋 Welcome ${result.user.name}!`);
    navigate('/');
  }
};
```

### Backend: User Registration
```javascript
const signup = async (req, res) => {
  const { name, email, password } = req.body;
  
  // Validate input
  // Hash password with bcryptjs
  // Generate verification token
  // Send verification email
  // Create user with emailVerified: false
  // Return success message
};
```

### Backend: 2FA Verification
```javascript
const verify2FA = async (req, res) => {
  const user = await User.findById(req.body.userId);
  
  // Verify OTP hash matches
  // Clear OTP from database
  // Generate JWT token
  // Return token and user data
};
```

---

## 📞 Contact & Support

For questions or issues related to the authentication flow, refer to:
- `backend/controllers/authController.js` - All auth logic
- `frontend/pages/Auth/Login.jsx` - Login UI flow
- `frontend/pages/Auth/Signup.jsx` - Signup UI flow
- `frontend/services/authService.js` - API integration

---

## 📄 Version Info

- **Project Version**: 1.0.0 (Authentication Phase)
- **Last Updated**: February 5, 2026
- **Status**: Production-Ready for Auth & 2FA
- **Node.js Version**: 16+ recommended
- **React Version**: 18+
- **MongoDB**: 4.4+ recommended

---

**End of Documentation**
