const twilio = require('twilio');

const isSmsEnabled = process.env.ENABLE_SMS_NOTIFICATIONS === 'true';

let client = null;
if (isSmsEnabled) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token) {
    client = twilio(sid, token);
    console.log('✅ Twilio client initialized');
  } else {
    console.warn('⚠️ Twilio credentials missing. SMS disabled');
  }
}

exports.sendSMS = async (to, body) => {
  if (!isSmsEnabled || !client) {
    const msg = `SMS disabled or Twilio not configured. Would send to ${to}: ${body}`;
    console.log(msg);
    // For dev, don't throw so flows can continue; caller may choose to fallback
    return true;
  }

  try {
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!from) throw new Error('TWILIO_FROM_NUMBER not set');

    await client.messages.create({
      body,
      from,
      to
    });

    console.log(`✅ SMS sent to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ Error sending SMS:', err.message);
    throw err;
  }
};

// Helper wrappers
exports.sendSignupVerificationSMS = async (phone, name, otp) => {
  // Dev mode: log OTP instead of sending
  if (process.env.NODE_ENV === 'development') {
    const msg = `ShareMyRide verification code: ${otp} (expires in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes)`;
    console.log(`📱 [DEV MODE] SMS would be sent to: ${phone}`);
    console.log(`📱 [DEV MODE] Message: ${msg}`);
    return true;
  }
  const body = `ShareMyRide verification code: ${otp} (expires in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes)`;
  return exports.sendSMS(phone, body);
};

exports.send2FASMS = async (phone, name, otp) => {
  const body = `Your ShareMyRide 2FA code is ${otp}. Do not share it with anyone.`;
  return exports.sendSMS(phone, body);
};
