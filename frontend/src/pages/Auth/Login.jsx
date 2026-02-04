import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, verify2FA } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import { success, error as showError, info } from '../../utils/toast';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('login'); // login or 2fa
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await loginUser({ email, password });
      
      if (result.requires2FA) {
        info('📧 2FA code sent to your email');
        setStep('2fa');
        setUserId(result.userId);
        setOtp('');
      } else if (result.requiresEmailVerification) {
        showError('Please verify your email first');
        navigate('/verify-email', { state: { email } });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!otp || otp.length !== 6) {
        showError('Please enter a valid 6-digit code');
        setError('Please enter a valid 6-digit code');
        setLoading(false);
        return;
      }

      const result = await verify2FA(userId, otp);
      
      if (result.token && result.user) {
        // Store in localStorage instead of calling login function
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Show welcome message with username
        const username = result.user.name || result.user.email;
        success(`👋 Welcome ${username}!`);
        
        // Navigate to home/dashboard
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Verification failed';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend2FA = async () => {
    setError('');
    setLoading(true);
    
    try {
      await loginUser({ email, password });
      success('📧 2FA code resent to your email');
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
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Sign in to continue to RideShare</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mb-5 sm:mb-6 flex items-start sm:items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 pl-4 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base" required disabled={loading} autoComplete="email" />
            </div>

            <div className="mb-5 sm:mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 pl-4 pr-10 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base" required disabled={loading} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400" disabled={loading}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center mt-5 sm:mt-6">
              <a href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-semibold text-xs sm:text-sm">
                Forgot password?
              </a>
            </div>

            <div className="text-center mt-4">
              <p className="text-gray-600 text-xs sm:text-sm">
                Don't have an account?{' '}
                <a href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Sign Up
                </a>
              </p>
            </div>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={handleVerify2FA} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Two-Factor Auth</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Enter the code sent to your email</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mb-5 sm:mb-6">
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="mb-6 sm:mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Authentication Code</label>
              <input type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength="6" className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required disabled={loading} />
              <p className="text-gray-500 text-xs sm:text-sm mt-2 text-center">Code expires in 15 minutes</p>
            </div>

            <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <div className="text-center mt-5 sm:mt-6">
              {resendTimer > 0 ? (
                <p className="text-gray-600 text-xs sm:text-sm">Resend code in <span className="font-semibold text-blue-600">{resendTimer}s</span></p>
              ) : (
                <button type="button" onClick={handleResend2FA} disabled={loading} className="text-blue-600 hover:text-blue-700 font-semibold text-xs sm:text-sm">
                  Didn't receive the code? Resend
                </button>
              )}
            </div>

            <button type="button" onClick={() => setStep('login')} className="mt-4 w-full border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition-all">
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;