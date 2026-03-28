# 2FA Authentication System - Quick Start Guide

## What's Been Implemented

A complete two-factor authentication system with:
- ✅ **Email verification on signup**
- ✅ **2FA (OTP) on login** 
- ✅ **Forgot password with OTP recovery**
- ✅ **Toast notifications for all flows**
- ✅ **Responsive mobile-first UI**
- ✅ **Professional email templates**

## Files Modified/Created

### Backend
```
✅ backend/models/User.js                          - Updated with 2FA fields
✅ backend/controllers/authController.js           - Complete 2FA flows
✅ backend/routes/authRoutes.js                    - New endpoints
✅ backend/services/emailService.js                - Email sending functions
✅ backend/utils/otpHelper.js                      - OTP generation utilities
```

### Frontend
```
✅ frontend/src/pages/Auth/Signup.jsx              - 3-step signup with email verification
✅ frontend/src/pages/Auth/Login.jsx               - 2-step login with 2FA
✅ frontend/src/pages/Auth/ForgotPassword.jsx      - 3-step password reset
✅ frontend/src/services/authService.js            - Updated API calls
✅ frontend/src/utils/toast.js                     - Global toast notifications
✅ frontend/src/routes/AppRoutes.jsx               - Added forgot-password route
```

## How to Test

### 1. Start Backend
```bash
cd backend
npm start
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test SignUp Flow
1. Go to /signup
2. Fill form and click "Sign Up"
3. Should see toast: "📧 Verification email sent to..."
4. Enter 6-digit OTP from email
5. Should see toast: "✅ Email verified successfully!"
6. Redirected to login page

### 4. Test Login Flow
1. Go to /login
2. Enter verified email and password
3. Should see toast: "📧 2FA code sent to your email"
4. Enter 6-digit OTP from email
5. Should see toast: "✅ Login successful!"
6. Redirected to home page with JWT token

### 5. Test Forgot Password Flow
1. Go to /forgot-password
2. Enter email
3. Should see toast: "📧 Password reset OTP sent..."
4. Enter OTP code, new password, confirm password
5. Should see toast: "✅ Password reset successful!"
6. Redirected to login page

## Environment Setup

Your `.env` file already has:
```
EMAIL_USER=abhayrajsinghmandloi@gmail.com
EMAIL_PASSWORD=ztiv ywwg ibpr errp
JWT_SECRET=457c0300c983e5be5851dd0045858f05
RAZORPAY credentials configured
```

## Important: Toast Notifications

The system uses global toast notifications. You need to set up a toast provider.

### Setup Toast in App.jsx:

**Option 1: Using react-toastify (Recommended)**
```bash
npm install react-toastify
```

Then in your `App.jsx`:
```jsx
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setToastCallback } from './utils/toast';

function App() {
  useEffect(() => {
    setToastCallback(({ message, type }) => {
      toast[type](message, {
        position: 'top-right',
        autoClose: 4000,
        closeOnClick: true,
      });
    });
  }, []);

  return (
    <>
      <ToastContainer />
      {/* Your routes */}
    </>
  );
}
```

**Option 2: Using Sonner (Modern)**
```bash
npm install sonner
```

See `TOAST_SETUP_GUIDE.md` for more options.

## Database Changes

The User model now has these new fields:
- `verificationToken` - OTP for email verification
- `verificationTokenExpire` - Expiration time for verification OTP
- `resetOTP` - OTP for password reset
- `resetOTPExpire` - Expiration time for reset OTP
- `twoFAOTP` - OTP for login 2FA
- `twoFAOTPExpire` - Expiration time for 2FA OTP
- `twoFAEnabled` - Optional flag for 2FA settings

Old accounts will still work fine - these fields are optional.

## API Endpoints

### Public Endpoints (No Auth Required)
- `POST /api/auth/signup` - Create account
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/login` - Login (sends 2FA OTP)
- `POST /api/auth/verify-2fa` - Verify 2FA OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Protected Endpoints (Auth Required)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

## Key Features

### Security
- 6-digit random OTP generation
- 15-minute OTP expiration
- Email verification before login
- 2FA on every login
- Password hashing with bcryptjs
- JWT token authentication

### User Experience
- Multi-step flows with clear progression
- Real-time password strength indicator
- OTP countdown timers
- Resend OTP with cooldown (60 seconds)
- Show/hide password toggles
- Mobile-responsive design
- Professional error messages

### Email Templates
- Branded HTML emails
- Clear call-to-action buttons
- Security messages
- Timer information

## Troubleshooting

### "Emails not sending?"
1. Check `.env` has correct EMAIL_USER and EMAIL_PASSWORD
2. Use Gmail App Password (if 2FA enabled on Gmail)
3. Check backend logs for errors

### "Toast not showing?"
1. Install and configure a toast library (see TOAST_SETUP_GUIDE.md)
2. Call `setToastCallback()` in your App.jsx
3. Check browser console for errors

### "OTP expired?"
- OTP expires after 15 minutes
- Use "Resend OTP" button to get a new one

### "Can't login after signup?"
- Email must be verified first
- Check you entered the correct OTP from email

## Documentation Files

1. **2FA_IMPLEMENTATION_GUIDE.md** - Detailed technical documentation
2. **TOAST_SETUP_GUIDE.md** - How to set up toast notifications
3. **This file** - Quick start guide

## Next Steps

1. ✅ Install toast notification library
2. ✅ Set up toast callback in App.jsx
3. ✅ Test all flows thoroughly
4. ✅ Customize email templates if needed
5. ✅ Deploy to production

## Support

For any issues:
1. Check the implementation guide
2. Review the error messages in console/logs
3. Test individual endpoints with Postman
4. Verify `.env` configuration

Happy coding! 🚀
