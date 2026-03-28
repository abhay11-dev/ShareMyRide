/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate OTP expiration time (15 minutes from now)
 */
const getOTPExpiration = () => {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
};

/**
 * Check if OTP is expired
 */
const isOTPExpired = (expireTime) => {
  return new Date() > expireTime;
};

module.exports = {
  generateOTP,
  getOTPExpiration,
  isOTPExpired
};
