import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser, verifyEmail, resendOTP } from '../../services/authService';
import { success, error as showError, info } from '../../utils/toast';

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState('signup'); // signup, verify, success
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password strength calculator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // Handle signup submission
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters');
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      const result = await signupUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      success(`📧 Verification email sent to ${formData.email}`);
      info('Please check your inbox and verify your email');
      setStep('verify');
      setOtp('');
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Signup failed';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle email verification
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp) {
      showError('Please enter the OTP');
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    
    try {
      await verifyEmail(formData.email, otp);
      success('✅ Email verified successfully!');
      info('You can now proceed to login');
      setStep('success');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'OTP invalid, please retry';
      showError(errorMsg);
      setError(errorMsg);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    setError('');
    setLoading(true);

    try {
      await resendOTP(formData.email);
      success('📧 OTP resent to your email');
      setResendTimer(60);
      
      // Countdown timer
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
      const errorMsg = err.response?.data?.message || err.message || 'Resend failed';
      showError(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-green-50 to-green-100 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {step === 'signup' && (
          <form onSubmit={handleSignup} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
              <p className="text-gray-600 text-xs sm:text-sm">Join RideShare today</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 pl-4 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm sm:text-base" required disabled={loading} />
            </div>

            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input type="email" placeholder="you@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 pl-4 pr-4 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm sm:text-base" required disabled={loading} />
            </div>

            <div className="mb-4 sm:mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full border border-gray-300 pl-4 pr-10 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm sm:text-base" required disabled={loading} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400" disabled={loading}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600">Strength:</span>
                    <span className={`text-xs font-semibold ${passwordStrength.strength <= 2 ? 'text-red-500' : passwordStrength.strength <= 3 ? 'text-yellow-500' : passwordStrength.strength <= 4 ? 'text-blue-500' : 'text-green-500'}`}>{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full"><div className={`h-full transition-all ${passwordStrength.color}`} style={{width: `${(passwordStrength.strength/5)*100}%`}} /></div>
                </div>
              )}
            </div>

            <div className="mb-6 sm:mb-7">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full border border-gray-300 pl-4 pr-10 py-2.5 sm:py-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm sm:text-base" required disabled={loading} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-gray-400" disabled={loading}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-center text-gray-600 text-xs sm:text-sm mt-5 sm:mt-6">
              Already have an account? <a href="/login" className="text-green-600 hover:text-green-700 font-semibold">Sign In</a>
            </p>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyEmail} className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Verify Email</h2>
              <p className="text-gray-600 text-xs sm:text-sm">We sent a code to {formData.email}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg mb-5 sm:mb-6">
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="mb-6 sm:mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Verification Code</label>
              <input type="text" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength="6" className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" required disabled={loading} />
              <p className="text-gray-500 text-xs sm:text-sm mt-2 text-center">Code expires in 15 minutes</p>
            </div>

            <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all duration-200">
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="text-center mt-5 sm:mt-6">
              {resendTimer > 0 ? (
                <p className="text-gray-600 text-xs sm:text-sm">Resend code in <span className="font-semibold text-green-600">{resendTimer}s</span></p>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResendOTP} 
                  disabled={loading} 
                  className="inline-block px-4 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 font-semibold text-xs sm:text-sm rounded-lg transition-colors"
                >
                  📧 Didn't receive the code? Resend
                </button>
              )}
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-white shadow-2xl rounded-2xl px-6 sm:px-8 py-8 sm:py-10 border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-600 text-sm mb-6">Your account is ready. Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Signup;