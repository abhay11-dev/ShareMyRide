# Quick Start Guide - Email/Phone SignUp & Login

## 📋 What's Been Implemented

You now have a complete email/phone signup and login system with EmailJS integration:

### ✅ Signup Page
- Users can **register with Email OR Phone** as verification method
- Conditional required fields (email required for email verification, phone required for phone verification)
- OTP verification after signup
- Works with EmailJS to send verification codes

### ✅ Login Page
- Users can **login with Email OR Phone** (whichever they registered with)
- **Separate 2FA method selection** (can receive 2FA via email even if logged in with phone)
- OTP verification via EmailJS before granting access
- Persists token & user data

### ✅ Backend Support
- Login endpoint accepts both email and phone
- Automatic EmailJS sending (with SendGrid fallback)
- Rate limiting & account locking after failed attempts
- OTP expiry (15 minutes)

---

## 🚀 Getting Started

### 1. Install Dependencies (if needed)

```bash
# Frontend
cd frontend
npm install @emailjs/browser

# Backend (optional, for Node < 18)
cd backend
npm install node-fetch@2
```

### 2. Environment Variables Already Set

Both `.env` files already contain EmailJS credentials:
- `VITE_EMAILJS_SERVICE_ID=service_n2jg9qv`
- `VITE_EMAILJS_TEMPLATE_ID=template_j9np7aq`
- `VITE_EMAILJS_PUBLIC_KEY=RpS3sAhhvmPJAaTLu`

### 3. Start Backend & Frontend

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 4. Test the Flows

**Frontend running on:** `http://localhost:5173`
**Backend running on:** `http://localhost:5000`

---

## 🧪 Testing Email/Phone Registration

### Signup with Email Verification
1. Go to http://localhost:5173/signup
2. Fill in:
   - Full Name: "John Doe"
   - Email: "john@example.com"
   - Phone: (leave empty or enter a phone)
   - Password: "Test1234!"
   - Select **"Email"** as verification method
   - Click "Sign Up"
3. Check terminal for **DEV: Verification code** message
4. Enter the OTP in the verification form
5. Success! Redirect to login

### Signup with Phone Verification
1. Go to http://localhost:5173/signup
2. Fill in:
   - Full Name: "Jane Doe"
   - Email: (can be optional)
   - Phone: "+911234567890" (required)
   - Password: "Test1234!"
   - Select **"SMS"** as verification method
   - Click "Sign Up"
3. Check terminal for **DEV: Verification code** message
4. Enter the OTP
5. Success! Redirect to login

### Login with Email
1. Go to http://localhost:5173/login
2. Select **"Email"** in "Login with" radio buttons
3. Enter email & password
4. Choose 2FA method (Email or SMS)
5. Click "Sign In"
6. Check terminal for **DEV: 2FA OTP for...** message
7. Enter the 2FA code
8. Success! Logged in

### Login with Phone
1. Go to http://localhost:5173/login
2. Select **"Phone"** in "Login with" radio buttons
3. Enter registered phone & password
4. Choose preferred 2FA method
5. Same verification flow
6. Success! Logged in

---

## 📧 EmailJS Integration Points

### Signup OTP Sending
- **When:** After signup form submission
- **Method:** Email OR SMS based on user selection
- **File:** `backend/services/emailService.js` → `sendSignupVerificationEmail()`

### Login 2FA Sending
- **When:** After successful password verification
- **Method:** Email OR SMS based on user preference
- **File:** `backend/services/emailService.js` → `send2FAEmail()` or SMS service

### Password Reset
- **When:** User requests password reset
- **Method:** Email (via EmailJS)
- **File:** `backend/services/emailService.js` → `sendPasswordResetEmail()`

---

## 🔍 Debugging & Logs

### Check Backend Logs
Look for these messages in the terminal running `npm run dev` in backend:

```
✅ Signup successful...
DEV: Email verification code for john@example.com = 123456
✅ Verification email sent to john@example.com
🔐 Login request...
DEV: 2FA OTP for john@example.com = 654321
📧 2FA OTP sent to john@example.com
```

### Check Frontend Errors
- Open browser DevTools (F12)
- Check **Console** tab for errors
- Check **Network** tab to see API calls

### Common Issues

| Issue | Solution |
|-------|----------|
| "EmailJS not configured" | Check `.env` files have correct credentials |
| OTP not sending | Check backend logs for send errors; verify SendGrid as fallback |
| Login fails with "Invalid credentials" | Ensure user completed signup verification first |
| "Too many failed attempts" | Account locked for 30 minutes; try again later |

---

## 📱 SMS Note

Currently SMS sending is **wired in the signup flow** but uses a placeholder SMS service. To fully enable SMS:

1. Sign up for **Twilio** (www.twilio.com)
2. Get API credentials (Account SID, Auth Token, Phone Number)
3. Update `backend/.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```
4. The SMS service in `backend/services/smsService.js` will automatically use these

For now, **Email verification works out of the box** ✅

---

## 🎨 UI Features

### Signup Page
- ✅ **Instant validation** on form inputs
- ✅ **Password strength indicator** (Weak → Fair → Good → Strong)
- ✅ **Conditional field labels** (shows "optional" for non-selected method)
- ✅ **Radio buttons** for Email vs SMS selection
- ✅ **OTP input** with auto-format (6 digits)
- ✅ **Resend button** with countdown timer
- ✅ **Success page** before redirect to login

### Login Page
- ✅ **Identifier type toggle** (Email vs Phone)
- ✅ **Dynamic input labels & placeholders**
- ✅ **Password visibility toggle**
- ✅ **2FA method selection** (separate from login method)
- ✅ **Back to login button** from 2FA screen
- ✅ **Toast notifications** for all actions

---

## 📂 Modified Files Summary

```
ShareMyRide/
├── frontend/
│   ├── .env ← Added EmailJS credentials
│   └── src/pages/Auth/
│       ├── Signup.jsx ← Email/Phone verification UI
│       └── Login.jsx ← Email/Phone login + 2FA with method toggle
├── backend/
│   ├── .env ← Added EmailJS REST credentials
│   ├── controllers/
│   │   └── authController.js ← Login now accepts email or phone
│   └── services/
│       └── emailService.js ← EmailJS REST API + SendGrid fallback
└── EMAILJS_SIGNUP_LOGIN_SETUP.md ← Detailed documentation
```

---

## 🚀 Next Steps (Optional Enhancements)

1. **Enable SMS Verification**: Set up Twilio & update `.env`
2. **Customize Email Templates**: Edit templates in EmailJS dashboard
3. **Add Social Login**: Google/Facebook OAuth (future)
4. **Enhance Security**: Add CAPTCHA for signup
5. **Email Notifications**: Send booking confirmations, ride updates via EmailJS

---

## 📞 Quick Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend errors
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Port already in use
- Frontend: Change `VITE_PORT` in `frontend/vite.config.js`
- Backend: Change `PORT` in `backend/.env`

---

## ✨ You're All Set!

Your ShareMyRide app now has:
- ✅ Professional signup with email or phone verification
- ✅ Flexible login with email or phone + 2FA
- ✅ EmailJS integration for reliable email delivery
- ✅ Beautiful, responsive UI
- ✅ Proper error handling & rate limiting

**Start the app and test it out!** 🎉

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Visit **http://localhost:5173** and go to the signup page!

---

**Questions?** Check:
1. Terminal logs for DEV messages
2. Browser console for frontend errors
3. EMAILJS_SIGNUP_LOGIN_SETUP.md for detailed documentation
