import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../../services/authService';
import { success, error as showError, info } from '../../utils/toast';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // email, otp, success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      success('📧 Password reset OTP sent to your email');
      info('Check your inbox for the code');
      setStep('otp');
      setOtp('');
      setResendTimer(0);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send OTP';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword
      });
      success('✅ Password reset successful!');
      info('You can now login with your new password');
      setStep('success');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to reset password';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      success('📧 OTP resent to your email');
      setResendTimer(60);
      setOtp('');
      
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-purple-50 to-purple-100 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {step === 'email' && (
          <form onSubmit={handleSendOTP} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Reset Password</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Enter your email to receive a reset code</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mb-5 sm:mb-6">
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="mb-6 sm:mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full border border-gray-300 pl-4 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base" 
                required 
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div className="text-center mt-5 sm:mt-6">
              <a href="/login" className="text-purple-600 hover:text-purple-700 font-semibold text-xs sm:text-sm">
                Back to Login
              </a>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleResetPassword} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Verify Code</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Enter the code sent to {email}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mb-5 sm:mb-6">
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Reset Code</label>
              <input 
                type="text" 
                placeholder="000000" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                maxLength="6" 
                className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none" 
                required 
                disabled={loading}
              />
            </div>

            <div className="mb-6 sm:mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full border border-gray-300 pl-4 pr-10 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base" 
                  required 
                  disabled={loading}
                  minLength={6}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-3 text-gray-400" 
                  disabled={loading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full border border-gray-300 pl-4 pr-10 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm sm:text-base" 
                  required 
                  disabled={loading}
                  minLength={6}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  className="absolute right-3 top-3 text-gray-400" 
                  disabled={loading}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || otp.length !== 6} 
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="text-center mt-5 sm:mt-6">
              {resendTimer > 0 ? (
                <p className="text-gray-600 text-xs sm:text-sm">Resend code in <span className="font-semibold text-purple-600">{resendTimer}s</span></p>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResendOTP} 
                  disabled={loading} 
                  className="text-purple-600 hover:text-purple-700 font-semibold text-xs sm:text-sm"
                >
                  Didn't receive the code? Resend
                </button>
              )}
            </div>

            <button 
              type="button" 
              onClick={() => setStep('email')} 
              className="mt-4 w-full border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition-all"
            >
              Change Email
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Password Reset!</h2>
            <p className="text-gray-600 text-sm mb-6">Your password has been successfully reset. Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
