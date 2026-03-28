# 2FA Authentication Implementation - Complete Guide

## Overview
This implementation provides a complete 2-Factor Authentication (2FA) flow for ShareMyRide with email-based verification and OTP for SignUp, SignIn, and Password Reset.

## Backend Changes

### 1. Updated User Model (`/backend/models/User.js`)
- Added `verificationToken` and `verificationTokenExpire` for email verification
- Added `resetOTP` and `resetOTPExpire` for password reset OTP
- Added `twoFAOTP` and `twoFAOTPExpire` for 2FA login verification
- Added `twoFAEnabled` for optional 2FA toggle
- Updated `toJSON()` method to exclude sensitive fields

### 2. OTP Helper Utility (`/backend/utils/otpHelper.js`)
- `generateOTP()`: Generates 6-digit random OTP
- `getOTPExpiration()`: Sets 15-minute expiration
- `isOTPExpired()`: Checks if OTP is expired

### 3. Enhanced Email Service (`/backend/services/emailService.js`)
Added three new email functions:
- `sendSignupVerificationEmail()`: Sends OTP for signup email verification
- `sendPasswordResetEmail()`: Sends OTP for password reset
- `send2FAEmail()`: Sends OTP for login 2FA
- All emails include professional HTML templates with branding

### 4. Auth Controller (`/backend/controllers/authController.js`)
**New Endpoints:**
- `POST /api/auth/signup` - Create account & send verification OTP
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/resend-otp` - Resend verification OTP
- `POST /api/auth/login` - Login with credentials (sends 2FA OTP)
- `POST /api/auth/verify-2fa` - Verify 2FA OTP and issue token
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP

**Authentication Flows:**

#### SignUp Flow:
1. User provides name, email, password
2. Backend generates OTP and sends email
3. User receives code and verifies on verification page
4. Email marked as verified
5. User can proceed to login

#### Login Flow:
1. User enters email and password
2. Backend validates credentials
3. Checks if email is verified (if not, prompts verification)
4. Generates 2FA OTP and sends to email
5. User enters OTP on 2FA page
6. Backend validates OTP and issues JWT token
7. User redirected to home page

#### Forgot Password Flow:
1. User enters email
2. Backend generates OTP and sends reset email
3. User enters OTP, new password, and confirm password
4. Backend validates and updates password
5. User redirected to login page

### 5. Auth Routes (`/backend/routes/authRoutes.js`)
- Updated with all new endpoints
- Maintained existing profile routes
- Added proper middleware for protected routes

## Frontend Changes

### 1. Toast Notification Utility (`/src/utils/toast.js`)
Global toast system for success, error, info, warning messages
- `setToastCallback()`: Registers callback for toast display
- `showToast()`, `success()`, `error()`, `info()`, `warning()`

### 2. Auth Service (`/src/services/authService.js`)
**Updated functions:**
- `signupUser()` - Signup with email verification flow
- `verifyEmail()` - Verify email with OTP
- `resendOTP()` - Resend verification OTP
- `loginUser()` - Login with 2FA trigger
- `verify2FA()` - Verify 2FA OTP
- `forgotPassword()` - Request password reset
- `resetPassword()` - Complete password reset
- `logout()` - Client-side cleanup

### 3. Signup Component (`/src/pages/Auth/Signup.jsx`)
**Three-step flow:**
1. **Signup Step**: Collect name, email, password
   - Password strength indicator
   - Form validation
   - Send signup request

2. **Email Verification Step**: Verify with OTP
   - 6-digit OTP input
   - Countdown timer (15 minutes)
   - Resend OTP button with cooldown

3. **Success Step**: Confirmation
   - Success message
   - Auto-redirect to login after 2 seconds

**Features:**
- Real-time password strength calculation
- Error messages with toast notifications
- Loading states and disabled inputs
- Responsive design (mobile & desktop)
- Clear toast messages for each step

### 4. Login Component (`/src/pages/Auth/Login.jsx`)
**Two-step flow:**
1. **Login Step**: Enter credentials
   - Email and password fields
   - Show/hide password toggle
   - Forgot password link

2. **2FA Verification Step**: Verify with OTP
   - 6-digit OTP input
   - Countdown timer (15 minutes)
   - Resend OTP button with cooldown
   - Back button to change email

**Features:**
- Handles email verification check before 2FA
- Clear error handling
- Toast notifications for each step
- Responsive design

### 5. Forgot Password Component (`/src/pages/Auth/ForgotPassword.jsx`)
**Three-step flow:**
1. **Email Step**: Enter email address
   - Validate email format
   - Send reset code

2. **Verification Step**: Verify OTP
   - Enter 6-digit code
   - Enter new password
   - Confirm password
   - Resend OTP option
   - Change email button

3. **Success Step**: Confirmation
   - Success message
   - Auto-redirect to login after 2 seconds

**Features:**
- Password validation (minimum 6 characters)
- Show/hide password toggles
- OTP countdown timer
- Comprehensive error handling
- Professional styling

### 6. App Routes (`/src/routes/AppRoutes.jsx`)
- Added `/forgot-password` route
- Uses PublicRoute wrapper (redirects if already logged in)

## Key Features

### Security
✅ 15-minute OTP expiration
✅ 6-digit random OTP generation
✅ Password hashing with bcryptjs
✅ JWT token-based authentication
✅ Email verification requirement before login
✅ Two-factor authentication on every login
✅ Secure password reset flow

### User Experience
✅ Clear multi-step flows
✅ Real-time password strength indicator
✅ Toast notifications for all actions
✅ OTP countdown timers
✅ Resend OTP functionality
✅ Show/hide password toggles
✅ Responsive mobile-first design
✅ Professional HTML email templates

### Error Handling
✅ Comprehensive error messages
✅ Input validation on frontend and backend
✅ OTP expiration checks
✅ Email uniqueness validation
✅ Password matching validation
✅ Graceful error recovery

## Installation & Setup

### Backend Requirements
1. Ensure `dotenv` is configured in `server.js`:
   ```javascript
   require('dotenv').config();
   ```

2. Update `.env` with email credentials:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

3. Restart backend server

### Frontend Setup
1. Ensure all toast messages are connected to a toast provider
2. Update App.jsx or main layout to display toasts:
   ```jsx
   import { setToastCallback } from './utils/toast';
   
   // In your main App component:
   useEffect(() => {
     setToastCallback(({ message, type }) => {
       // Your toast implementation here
       console.log(`[${type}] ${message}`);
     });
   }, []);
   ```

## API Endpoints Reference

### Signup
- **POST** `/api/auth/signup`
  - Body: `{ name, email, password }`
  - Response: `{ success, message, email, requiresVerification }`

### Verify Email
- **POST** `/api/auth/verify-email`
  - Body: `{ email, otp }`
  - Response: `{ success, message }`

### Resend OTP
- **POST** `/api/auth/resend-otp`
  - Body: `{ email }`
  - Response: `{ success, message }`

### Login
- **POST** `/api/auth/login`
  - Body: `{ email, password }`
  - Response: `{ success, message, requires2FA, email, userId }`

### Verify 2FA
- **POST** `/api/auth/verify-2fa`
  - Body: `{ userId, otp }`
  - Response: `{ success, message, token, user }`

### Forgot Password
- **POST** `/api/auth/forgot-password`
  - Body: `{ email }`
  - Response: `{ success, message }`

### Reset Password
- **POST** `/api/auth/reset-password`
  - Body: `{ email, otp, newPassword, confirmPassword }`
  - Response: `{ success, message }`

## Testing Checklist

### Backend Testing
- [ ] OTP generation creates valid 6-digit codes
- [ ] OTP expires after 15 minutes
- [ ] Email verification prevents login for unverified users
- [ ] 2FA OTP generated on every login attempt
- [ ] Password reset validates all required fields
- [ ] Invalid OTP returns proper error
- [ ] Expired OTP returns proper error
- [ ] User cannot reset password with wrong OTP

### Frontend Testing
- [ ] Signup page displays all form fields
- [ ] Password strength indicator works
- [ ] Verification page appears after signup
- [ ] OTP countdown displays correctly
- [ ] Resend button activates after 60 seconds
- [ ] Email verification redirects to login
- [ ] Login triggers 2FA page
- [ ] 2FA page displays countdown
- [ ] Invalid OTP shows error
- [ ] Forgot password flow works end-to-end
- [ ] Success pages auto-redirect correctly
- [ ] Toast messages display for all actions
- [ ] Mobile responsive design works
- [ ] Form validation prevents invalid submissions

## Troubleshooting

### Emails Not Sending
1. Check EMAIL_USER and EMAIL_PASSWORD in .env
2. Enable "Less secure app access" in Gmail settings
3. Use Gmail App Password if 2FA enabled on Gmail
4. Check server logs for email service errors

### OTP Not Received
1. Check spam/junk folder
2. Verify EMAIL_USER is correct
3. Check backend logs for email sending errors
4. Resend OTP button should retry

### Frontend Toasts Not Showing
1. Ensure toast callback is registered in main App
2. Check browser console for errors
3. Verify toast component is properly imported
4. Test with console.log to confirm flow

## Future Enhancements
- SMS-based OTP as alternative
- Backup codes for 2FA
- Device/browser recognition for 2FA
- Optional 2FA toggle in user settings
- Session management with device tracking
- Account recovery flow
- Rate limiting on OTP requests
