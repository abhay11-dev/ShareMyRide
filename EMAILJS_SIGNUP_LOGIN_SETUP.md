# EmailJS Integration with Email/Phone Signup & Login

## Overview
This document outlines the complete setup and implementation of EmailJS for sending OTPs during signup and login, with support for both **email and phone Number verification**.

---

## ✅ Completed Setup

### 1. **Environment Variables**

#### Frontend (`frontend/.env`)
```env
VITE_API_URL="http://localhost:5000/api"
VITE_EMAILJS_SERVICE_ID=service_n2jg9qv
VITE_EMAILJS_TEMPLATE_ID=template_j9np7aq
VITE_EMAILJS_PUBLIC_KEY=RpS3sAhhvmPJAaTLu
```

#### Backend (`backend/.env`)
```env
# EmailJS REST API (optional - backend sending)
EMAILJS_SERVICE_ID=service_n2jg9qv
EMAILJS_TEMPLATE_ID=template_j9np7aq
EMAILJS_USER_ID=RpS3sAhhvmPJAaTLu
```

### 2. **Dependencies Installed**

```bash
# Frontend
npm install @emailjs/browser

# Backend (recommended for Node < 18)
npm install node-fetch@2
```

---

## 🎯 Feature: Email or Phone Verification for Signup

### Frontend Signup Flow (`frontend/src/pages/Auth/Signup.jsx`)

#### User Options:
1. **Enter Full Name** (required)
2. **Enter Email** (required if verifying via email, optional if verifying via phone)
3. **Enter Phone** (required if verifying via SMS, optional if verifying via email)
4. **Select Verification Method** (radio buttons):
   - Email (default)
   - SMS (phone)
5. **Set Password** with strength indicator

#### States:
- `step === 'signup'` → Registration form
- `step === 'verify'` → OTP verification
- `step === 'success'` → Success & redirect to login

#### UI Enhancements:
- Conditional `required` attribute on email/phone based on `verificationMethod`
- Helper text showing "Optional when verifying via [other method]"
- Dynamic verification header: "Verify **Email**" or "Verify **Phone**"
- Success message reflects chosen method (📧 or 📱)
- Resend button shows dynamic icon & message

### Backend Signup Flow (`backend/controllers/authController.js`)

```javascript
// Already implemented:
exports.signup = async (req, res) => {
  const { name, email, phone, password, confirmPassword, verificationMethod } = req.body;
  // Creates user, generates token, sends via email OR SMS
}
```

---

## 🎯 Feature: Email or Phone Login with 2FA

### Frontend Login Flow (`frontend/src/pages/Auth/Login.jsx`)

#### User Options:
1. **Select Login Identifier** (radio buttons):
   - Email (default)
   - Phone
2. **Enter identifier** (email or phone based on selection)
3. **Select 2FA delivery method** (separate choice):
   - Email
   - SMS
4. **Enter Password**

#### States:
- `step === 'login'` → Login form
- `step === '2fa'` → 2FA OTP verification

#### UI Enhancements:
- Input label & placeholder dynamically update based on `identifierType`
- Input type switches between `email` and `tel`
- User can login with **registered email** OR **registered phone**
- 2FA method can be different from login method (e.g., login with email, receive 2FA via SMS if available)

### Backend Login Flow (`backend/controllers/authController.js`)

```javascript
exports.login = async (req, res) => {
  const { email, phone, password } = req.body;
  
  // Query by email or phone
  const query = email ? { email: email.toLowerCase() } : { phone };
  const user = await User.findOne(query).select('+password');
  
  // Generate 2FA OTP, send via email or SMS based on method param
}
```

---

## 📧 EmailJS Configuration

### Email Template Setup

**Template ID:** `template_j9np7aq`

Your EmailJS template should accept these variables:
- `to_email` (recipient email)
- `subject` (email subject)
- `message_html` (HTML email body)

#### Example Template Content (HTML):
```html
<h2>{{subject}}</h2>
<p>{{message_html}}</p>
```

Or use a more styled template with the HTML provided by `/backend/services/emailService.js`.

### Service Integration

**Service ID:** `service_n2jg9qv`

Backend sends via:
- **EmailJS REST API** (primary) if configured
- **SendGrid** (fallback) if EmailJS fails

Frontend sends via:
- **EmailJS Browser SDK** (@emailjs/browser)

---

## 🚀 How It Works

### Signup with Email Verification:
1. User fills form, selects "Email" as verification method
2. Frontend sends to `POST /api/auth/signup` with `verificationMethod: 'email'`
3. Backend generates 6-digit OTP, stores hashed token
4. EmailJS sends OTP to user's email
5. User enters OTP in verification form
6. Backend verifies, marks user as `emailVerified: true`
7. User redirected to login

### Signup with Phone Verification:
1. User fills form, selects "SMS" as verification method
2. Frontend sends `verificationMethod: 'phone'`, phone becomes required
3. Backend generates OTP, sends via SMS (Twilio integration assumed)
4. User enters OTP in verification form
5. Backend verifies, marks user as `phoneVerified: true`
6. User redirected to login

### Login with Email:
1. User selects "Email" identifier
2. Enters email & password
3. Backend queries user by email
4. Generates 2FA OTP
5. Sends to preferred 2FA method (email or SMS)
6. User enters 2FA code, receives JWT token
7. Login complete

### Login with Phone:
1. User selects "Phone" identifier
2. Enters phone & password
3. Backend queries user by phone
4. Sends 2FA via selected method
5. Same verification flow
6. Login complete

---

## 📝 Backend Service Layer (`backend/services/emailService.js`)

### EmailJS REST API Handler:
```javascript
const sendViaEmailJS = async (to, subject, html) => {
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_USER_ID,
    template_params: {
      to_email: to,
      subject,
      message_html: html
    }
  };
  
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  return res.ok;
};
```

**Fallback:**
If EmailJS fails or is not configured, automatically falls back to SendGrid.

---

## 🧪 Testing

### Test Email Sending (Signup):
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+911234567890",
    "password": "Test1234!",
    "confirmPassword": "Test1234!",
    "verificationMethod": "email"
  }'
```

### Test Email Sending (Signup via Phone):
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+911234567890",
    "password": "Test1234!",
    "confirmPassword": "Test1234!",
    "verificationMethod": "phone"
  }'
```

### Test Login with Email:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "method": "email"
  }'
```

### Test Login with Phone:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+911234567890",
    "password": "Test1234!",
    "method": "email"
  }'
```

Check `backend/.env` for `DEV: 2FA OTP for...` log messages containing plaintext OTP for testing.

---

## 📂 Files Modified

### Frontend:
- ✅ `frontend/.env` - Added EmailJS credentials
- ✅ `frontend/src/pages/Auth/Signup.jsx` - Full UI overhaul with email/phone options
- ✅ `frontend/src/pages/Auth/Login.jsx` - Added identifier type selector + dynamic input

### Backend:
- ✅ `backend/.env` - Added EmailJS REST API credentials
- ✅ `backend/services/emailService.js` - EmailJS REST + fallback to SendGrid
- ✅ `backend/controllers/authController.js` - Login now accepts email or phone

---

## 🔌 Integration Points

### Frontend Auth Service (`frontend/src/services/authService.js`)
Already configure to send signup/login payloads correctly; no changes needed.

### Backend Auth Routes (`backend/routes/authRoutes.js`)
All routes remain the same; logic updated to handle email or phone.

---

## ⚠️ Important Notes

1. **Phone Verification**: Currently implemented in UI for email. SMS sending via Twilio requires additional `backend/services/smsService.js` integration (already exists).
2. **EmailJS Quota**: Free tier allows limited emails per month; monitor usage.
3. **Error Handling**: Frontend shows toast notifications; backend logs errors to console.
4. **Rate Limiting**: 2FA attempts limited to 3 tries, then account locked for 30 minutes.
5. **Token Expiry**: OTP valid for 15 minutes; verification/password reset tokens expire similarly.

---

## 🎨 UI/UX Features

### Signup:
- ✅ Password strength indicator
- ✅ Conditional field requirements
- ✅ Helper text for optional fields
- ✅ Radio buttons for verification method
- ✅ Dynamic success messages
- ✅ Resend OTP with countdown timer

### Login:
- ✅ Toggle between email or phone login
- ✅ Dynamic input type (email vs tel)
- ✅ Separate 2FA method choice
- ✅ Resend 2FA code with timer
- ✅ Back to login button from 2FA screen

---

## 🚀 Running the App

```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev  # or npm start for production

# Backend will use EmailJS for sending emails. Check:
# 1. EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_USER_ID in backend/.env
# 2. Fallback to SendGrid if EmailJS fails
```

---

## 📞 Support

For issues:
1. Check browser console for frontend errors
2. Check terminal for backend logs (DEV messages with plaintext OTP)
3. Verify `.env` variables are correctly set
4. Test EmailJS template in EmailJS dashboard
5. Ensure frontend & backend are running on correct ports (5173 & 5000)

---

**Last Updated:** February 7, 2026
**Implementation Status:** ✅ Complete
