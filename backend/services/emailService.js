const sgMail = require('@sendgrid/mail');

// If EmailJS is configured (service + template + user), prefer EmailJS REST API.
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID;

// Initialize SendGrid if available
if (!process.env.SENDGRID_API_KEY) {
  console.warn('⚠️ SENDGRID_API_KEY not configured in .env — SendGrid fallback disabled');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized successfully');
}

// Helper function to send email via SendGrid (fallback)
const sendViaSendGrid = async (to, subject, html) => {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_USER,
      subject,
      html
    };
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('❌ SendGrid error:', error.message || error);
    throw error;
  }
};

// Helper function to send email via EmailJS REST API
const sendViaEmailJS = async (to, subject, html) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID) {
    throw new Error('EmailJS not configured');
  }

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

  // Prefer global fetch (Node 18+). Try to require node-fetch if global fetch is missing.
  let fetchFn = (typeof fetch !== 'undefined') ? fetch : null;
  if (!fetchFn) {
    try {
      // node-fetch v2 supports require()
      // If not installed, the require will fail and we'll fall back to SendGrid
      // (the caller handles fallback when sendViaEmailJS throws).
      // eslint-disable-next-line global-require
      fetchFn = require('node-fetch');
      console.log('✅ Using node-fetch for EmailJS API calls');
    } catch (err) {
      console.warn('⚠️ node-fetch not installed and global fetch unavailable. EmailJS REST will not be used.');
      throw new Error('fetch not available');
    }
  }

  const res = await fetchFn('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    const msg = `EmailJS error: ${res.status} ${res.statusText} - ${txt}`;
    console.error(msg);
    throw new Error(msg);
  }

  return true;
};

// Primary sendEmail helper: prefer EmailJS if configured, otherwise SendGrid
const sendEmail = async (to, subject, html) => {
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_USER_ID) {
    try {
      return await sendViaEmailJS(to, subject, html);
    } catch (err) {
      console.error('⚠️ EmailJS send failed, falling back to SendGrid:', err.message);
    }
  }

  // Fallback to SendGrid
  return await sendViaSendGrid(to, subject, html);
};

// Test SendGrid connection on startup
(async () => {
  try {
    // SendGrid doesn't have a direct verify method, so we log that it's ready
    console.log('✅ Email service ready');
  } catch (error) {
    console.error('❌ Email service error:', error.message);
  }
})();

/**
 * Send email verification OTP for signup
 */
exports.sendSignupVerificationEmail = async (email, name, otp) => {
  // Dev mode: log OTP instead of sending
  if (process.env.NODE_ENV === 'development' && process.env.EMAIL_DEBUG === 'true') {
    console.log(`📧 [DEV MODE] Verification email would be sent to: ${email}`);
    console.log(`📧 [DEV MODE] OTP: ${otp}`);
    return true;
  }
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
          .otp-code { font-size: 32px; font-weight: bold; color: #10B981; letter-spacing: 5px; margin: 20px 0; font-family: monospace; }
          .warning { color: #ef4444; font-size: 12px; margin-top: 15px; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to ShareMyRide!</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for signing up! To complete your registration, please verify your email address using the code below:</p>
          
          <div class="box">
            <p>Your verification code is:</p>
            <div class="otp-code">${otp}</div>
            <p class="warning">⏰ This code will expire in 15 minutes</p>
          </div>
          
          <p>If you didn't create this account, please ignore this email.</p>
          
          <div class="footer">
            <p>🚗 ShareMyRide - Your Trusted Ride Sharing Platform</p>
            <p>© 2026 ShareMyRide. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  try {
    await sendEmail(email, '🔐 Verify Your Email - ShareMyRide', html);
    console.log(`✅ Signup verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending signup verification email:', error.message);
    // In development, continue so user can test the flow
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ [DEV] Continuing signup despite email service error');
      return true;
    }
    throw error;
  }
};

/**
 * Send password reset OTP
 */
exports.sendPasswordResetEmail = async (email, name, otp) => {
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
          .otp-code { font-size: 32px; font-weight: bold; color: #3B82F6; letter-spacing: 5px; margin: 20px 0; font-family: monospace; }
          .warning { color: #ef4444; font-size: 12px; margin-top: 15px; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>We received a request to reset your password. Use the code below to proceed:</p>
          
          <div class="box">
            <p>Your password reset code is:</p>
            <div class="otp-code">${otp}</div>
            <p class="warning">⏰ This code will expire in 15 minutes</p>
          </div>
          
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          
          <div class="footer">
            <p>🚗 ShareMyRide - Your Trusted Ride Sharing Platform</p>
            <p>© 2026 ShareMyRide. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  try {
    await sendEmail(email, '🔑 Password Reset Request - ShareMyRide', html);
    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    throw error;
  }
};

/**
 * Send 2FA OTP for login
 */
exports.send2FAEmail = async (email, name, otp) => {
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
          .otp-code { font-size: 32px; font-weight: bold; color: #F59E0B; letter-spacing: 5px; margin: 20px 0; font-family: monospace; }
          .warning { color: #ef4444; font-size: 12px; margin-top: 15px; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Two-Factor Authentication</h1>
        </div>
        
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Your login is being authenticated. Enter the code below to continue:</p>
          
          <div class="box">
            <p>Your 2FA code is:</p>
            <div class="otp-code">${otp}</div>
            <p class="warning">⏰ This code will expire in 15 minutes</p>
          </div>
          
          <p>If you didn't attempt to log in, please ignore this email.</p>
          
          <div class="footer">
            <p>🚗 ShareMyRide - Your Trusted Ride Sharing Platform</p>
            <p>© 2026 ShareMyRide. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  try {
    await sendEmail(email, '🔐 Your 2FA Code - ShareMyRide', html);
    console.log(`✅ 2FA email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending 2FA email:', error.message);
    throw error;
  }
};

/**
 * Send payment receipt to passenger
 */
exports.sendPaymentReceipt = async (transaction, booking, passenger, driver) => {
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .total-row { background: #eff6ff; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 20px; font-weight: bold; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <p>Thank you for your payment</p>
        </div>
        
        <div class="content">
          <h2>Hi ${passenger.name},</h2>
          <p>Your payment has been successfully processed. Here are your booking details:</p>
          
          <div class="box">
            <h3>🚗 Ride Details</h3>
            <div class="row">
              <span><strong>From:</strong></span>
              <span>${booking.pickupLocation}</span>
            </div>
            <div class="row">
              <span><strong>To:</strong></span>
              <span>${booking.dropLocation}</span>
            </div>
            <div class="row">
              <span><strong>Date:</strong></span>
              <span>${new Date(booking.rideId.date).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span><strong>Time:</strong></span>
              <span>${booking.rideId.time}</span>
            </div>
            <div class="row">
              <span><strong>Seats:</strong></span>
              <span>${booking.seatsBooked}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>💰 Payment Breakdown</h3>
            <div class="row">
              <span>Base Fare:</span>
              <span>₹${booking.baseFare.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Platform Fee:</span>
              <span>₹${booking.platformFee.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>GST:</span>
              <span>₹${booking.gst.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <div class="row" style="border: none;">
                <span>Total Paid:</span>
                <span style="color: #3B82F6;">₹${booking.totalFare.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="box">
            <h3>👤 Driver Information</h3>
            <div class="row">
              <span>Name:</span>
              <span>${driver.name}</span>
            </div>
            <div class="row">
              <span>Phone:</span>
              <span>${driver.phone || booking.rideId.phoneNumber}</span>
            </div>
            <div class="row">
              <span>Vehicle:</span>
              <span>${booking.rideId.vehicleNumber}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>📄 Transaction Details</h3>
            <div class="row">
              <span>Transaction ID:</span>
              <span style="font-size: 12px;">${transaction._id}</span>
            </div>
            <div class="row">
              <span>Payment ID:</span>
              <span style="font-size: 12px;">${transaction.razorpayPaymentId}</span>
            </div>
            <div class="row">
              <span>Date & Time:</span>
              <span>${new Date(transaction.paymentCapturedAt).toLocaleString()}</span>
            </div>
            <div class="row">
              <span>Payment Method:</span>
              <span style="text-transform: capitalize;">${transaction.paymentMethod}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/my-bookings" class="button">View My Bookings</a>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #3B82F6; border-radius: 4px;">
            <strong>Important:</strong> Please be ready at the pickup location 10 minutes before the scheduled time. 
            The driver will contact you if needed.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>© 2025 RideShare. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

  try {
    await sendEmail(passenger.email, '✅ Payment Receipt - RideShare', html);
    console.log('✅ Receipt email sent to passenger:', passenger.email);
    return true;
  } catch (error) {
    console.error('❌ Error sending receipt email:', error.message);
    return false;
  }
};

/**
 * Send payment notification to driver
 */
exports.sendDriverPaymentNotification = async (transaction, booking, passenger, driver) => {
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .earnings-box { background: #d1fae5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .earnings { font-size: 32px; font-weight: bold; color: #10B981; margin: 10px 0; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 Payment Received!</h1>
          <p>Your passenger has completed the payment</p>
        </div>
        
        <div class="content">
          <h2>Hi ${driver.name},</h2>
          <p>Great news! Payment for booking <strong>#${booking._id.toString().slice(-8)}</strong> has been received.</p>
          
          <div class="earnings-box">
            <p style="margin: 0; color: #065f46; font-weight: 600;">Your Earnings</p>
            <div class="earnings">₹${transaction.driverNetAmount.toFixed(2)}</div>
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              (After ₹${transaction.baseCommissionAmount.toFixed(2)} platform fee + ₹${transaction.gstAmount.toFixed(2)} GST)
            </p>
          </div>
          
          <div class="box">
            <h3>🚗 Ride Details</h3>
            <div class="row">
              <span>From:</span>
              <span>${booking.pickupLocation}</span>
            </div>
            <div class="row">
              <span>To:</span>
              <span>${booking.dropLocation}</span>
            </div>
            <div class="row">
              <span>Date:</span>
              <span>${new Date(booking.rideId.date).toLocaleDateString()}</span>
            </div>
            <div class="row">
              <span>Time:</span>
              <span>${booking.rideId.time}</span>
            </div>
            <div class="row">
              <span>Seats:</span>
              <span>${booking.seatsBooked}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>👤 Passenger Information</h3>
            <div class="row">
              <span>Name:</span>
              <span>${passenger.name}</span>
            </div>
            <div class="row">
              <span>Phone:</span>
              <span>${passenger.phone || 'Not provided'}</span>
            </div>
            <div class="row">
              <span>Email:</span>
              <span>${passenger.email}</span>
            </div>
          </div>
          
          <div class="box">
            <h3>💳 Payment Breakdown</h3>
            <div class="row">
              <span>Total Fare:</span>
              <span>₹${transaction.totalAmount.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>Platform Commission (10%):</span>
              <span>- ₹${transaction.baseCommissionAmount.toFixed(2)}</span>
            </div>
            <div class="row">
              <span>GST (18% on commission):</span>
              <span>- ₹${transaction.gstAmount.toFixed(2)}</span>
            </div>
            <div style="background: #d1fae5; font-weight: bold; border: none; margin-top: 10px; padding: 15px; border-radius: 6px; display: flex; justify-content: space-between;">
              <span>Your Net Earnings:</span>
              <span style="color: #10B981; font-size: 18px;">₹${transaction.driverNetAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/upcoming-rides" class="button">View My Rides</a>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <strong>⚠️ Reminder:</strong> Please be at the pickup location on time and contact your passenger if needed.
          </div>
        </div>
        
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>© 2025 RideShare. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

  try {
    await sendEmail(driver.email, '💰 Payment Received - RideShare', html);
    console.log('✅ Payment notification sent to driver:', driver.email);
    return true;
  } catch (error) {
    console.error('❌ Error sending driver notification:', error.message);
    return false;
  }
};

/**
 * Send ride reminder (1 day before)
 */
exports.sendRideReminder = async (booking, user, userType) => {
  const isDriver = userType === 'driver';
  
  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .time-box { background: #fef3c7; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .time { font-size: 36px; font-weight: bold; color: #D97706; }
          .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Ride Reminder</h1>
          <p>Your ride is scheduled for tomorrow!</p>
        </div>
        
        <div class="content">
          <h2>Hi ${user.name},</h2>
          <p>${isDriver ? 'You have a ride scheduled for tomorrow.' : 'Your ride is scheduled for tomorrow!'}</p>
          
          <div class="time-box">
            <p style="margin: 0; color: #92400e; font-weight: 600;">Tomorrow at</p>
            <div class="time">${booking.rideId.time}</div>
          </div>
          
          <div class="box">
            <h3>🚗 Ride Details</h3>
            <p><strong>From:</strong> ${booking.pickupLocation}</p>
            <p><strong>To:</strong> ${booking.dropLocation}</p>
            <p><strong>Date:</strong> ${new Date(booking.rideId.date).toLocaleDateString()}</p>
            <p><strong>Seats:</strong> ${booking.seatsBooked}</p>
            ${isDriver ? 
              `<p><strong>Passenger:</strong> ${booking.passengerId.name} (${booking.passengerId.phone || booking.passengerId.email})</p>` : 
              `<p><strong>Driver:</strong> ${booking.rideId.driverId.name} (${booking.rideId.phoneNumber})</p>`
            }
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/upcoming-rides" class="button">View Details</a>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #3B82F6; border-radius: 4px;">
            <strong>💡 Tip:</strong> ${isDriver ? 
              'Contact your passenger to confirm pickup details.' : 
              'Make sure you\'re ready 10 minutes before the scheduled time.'
            }
          </div>
        </div>
      </body>
      </html>
    `;

  try {
    await sendEmail(user.email, `🔔 Ride Reminder - Tomorrow at ${booking.rideId.time}`, html);
    console.log(`✅ Ride reminder sent to ${userType}:`, user.email);
    return true;
  } catch (error) {
    console.error('❌ Error sending ride reminder:', error.message);
    return false;
  }
};

module.exports = exports;