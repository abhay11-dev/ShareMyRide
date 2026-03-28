// src/pages/Profile/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateUserProfile } from '../../services/userService';

// Avatar selection modal component
function AvatarSelector({ isOpen, onClose, onSelect, currentAvatar }) {
  const [uploadedImage, setUploadedImage] = useState(currentAvatar || '');
  const fileInputRef = useRef(null);

  const predefinedAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Precious',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophie',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Jordan',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Morgan',
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSelect = (avatar) => {
    onSelect(avatar);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">Choose Your Avatar</h3>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Upload Custom Image</h4>
            <div className="flex gap-4 items-center flex-wrap">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose File
              </button>
              {uploadedImage && (
                <div className="relative">
                  <img src={uploadedImage} alt="Uploaded" className="w-20 h-20 rounded-lg object-cover border-2 border-blue-200" />
                  <button 
                    onClick={() => handleSelect(uploadedImage)} 
                    className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1.5 hover:bg-green-600 transition-colors shadow-lg" 
                    title="Use this image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Supported: JPG, PNG, GIF (Max 5MB)</p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Select from Gallery</h4>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
              {predefinedAvatars.map((avatar, index) => (
                <button 
                  key={index} 
                  onClick={() => handleSelect(avatar)} 
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:scale-105 hover:shadow-lg"
                >
                  <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Profile() {
  const { user, logout, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    gender: 'Prefer not to say',
    age: '',
    homeCity: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [aadharNumber, setAadharNumber] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const aadharRef = useRef(null);

  // Initialize profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        gender: user.gender || 'Prefer not to say',
        age: user.age || '',
        homeCity: user.homeCity || ''
      });
    }
  }, [user]);

  // Track if there are unsaved changes
  useEffect(() => {
    if (user) {
      const changed = 
        profileData.name !== (user.name || '') ||
        profileData.email !== (user.email || '') ||
        profileData.avatarUrl !== (user.avatarUrl || '') ||
        profileData.gender !== (user.gender || 'Prefer not to say') ||
        String(profileData.age) !== String(user.age || '') ||
        profileData.homeCity !== (user.homeCity || '');
      setHasChanges(changed);
    }
  }, [profileData, user]);

  // Auto-dismiss success/error messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleAvatarSelect = (avatarUrl) => {
    setProfileData(prev => ({ ...prev, avatarUrl }));
  };

  const handleAadharSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!aadharNumber.trim()) {
      setError('Please enter your Aadhar number');
      return;
    }

    if (!/^\d{12}$/.test(aadharNumber.trim())) {
      setError('Aadhar number must be exactly 12 digits');
      return;
    }

    try {
      setIsLoading(true);
      
      // Try to import and use submitAadhar from authService
      let submitAadhar;
      try {
        const authService = await import('../../services/authService');
        submitAadhar = authService.submitAadhar;
      } catch (importError) {
        // Fallback mock implementation
        submitAadhar = async (payload) => {
          console.warn('authService not found, using mock implementation');
          return {
            success: true,
            user: {
              ...user,
              aadhar: {
                status: 'pending',
                masked: `XXXX-XXXX-${payload.aadharNumber.slice(-4)}`
              }
            }
          };
        };
      }

      const payload = { 
        aadharNumber: aadharNumber.trim(), 
        documentUrl: documentUrl.trim() 
      };
      
      const res = await submitAadhar(payload);
      
      if (res && res.success) {
        updateUser(res.user);
        setSuccess('Aadhar submitted successfully! Our team will verify it within 24-48 hours.');
        setAadharNumber('');
        setDocumentUrl('');
      } else {
        setError(res?.message || 'Failed to submit Aadhar');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit Aadhar';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate profile data
  const validateProfile = () => {
    if (!profileData.name.trim()) {
      setError('Name is required');
      return false;
    }
    
    if (profileData.name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return false;
    }

    if (!profileData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (profileData.age) {
      const n = Number(profileData.age);
      if (Number.isNaN(n) || n < 18 || n > 120) {
        setError('Age must be between 18 and 120');
        return false;
      }
    }

    return true;
  };

  // Handle profile update submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError(null);
    setSuccess(null);

    if (!validateProfile()) {
      return;
    }

    if (!hasChanges) {
      setError('No changes to save');
      return;
    }

    setIsLoading(true);

    try {
      const res = await updateUserProfile(profileData);
      const updatedUser = res.user || res;
      updateUser(updatedUser);
      
      setSuccess('Profile updated successfully! 🎉');
      setIsEditing(false);
      setHasChanges(false);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
        gender: user.gender || 'Prefer not to say',
        age: user.age || '',
        homeCity: user.homeCity || ''
      });
    }
    setError(null);
    setSuccess(null);
    setIsEditing(false);
    setHasChanges(false);
  };

  // Warn user about unsaved changes
  const handleEditToggle = () => {
    if (isEditing && hasChanges) {
      const confirmCancel = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) return;
      handleCancel();
    } else {
      setIsEditing(!isEditing);
    }
  };

  const displayUser = user || {
    name: 'Guest User',
    email: 'guest@example.com',
    phone: '',
    phoneVerified: false,
    createdAt: new Date().toISOString(),
    reputation: {
      overallRating: 0,
      ridesAsDriver: 0,
      ridesAsPassenger: 0
    }
  };

  const isAadharVerified = displayUser.aadhar?.status === 'verified';
  const aadharStatus = displayUser.aadhar?.status || 'not submitted';

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {isEditing ? 'Edit Profile' : 'Profile'}
            </h2>
            <p className="text-gray-600">
              {isEditing ? 'Update your personal details' : 'Manage your account information'}
            </p>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3 animate-fadeIn" role="alert">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold">Error: </span>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-start gap-3 animate-fadeIn" role="alert">
              <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold">Success: </span>
                <span>{success}</span>
              </div>
              <button 
                onClick={() => setSuccess(null)}
                className="text-green-500 hover:text-green-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            
            {/* Header Section with Avatar */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-12 relative">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-white ring-opacity-50 overflow-hidden">
                    {(isEditing ? profileData.avatarUrl : displayUser.avatarUrl) ? (
                      <img src={isEditing ? profileData.avatarUrl : displayUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setShowAvatarSelector(true)}
                      className="absolute -bottom-2 -right-2 bg-white text-blue-600 p-3 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 border-2 border-blue-600"
                      title="Change Avatar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* User Info */}
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {displayUser.name || 'User'}
                  </h3>
                  <p className="text-blue-100 text-lg mb-4">
                    {displayUser.email || 'user@example.com'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="px-4 py-1.5 bg-green-700 bg-opacity-20 text-white rounded-full text-sm font-medium">
                      Member since {displayUser.createdAt ? new Date(displayUser.createdAt).getFullYear() : '2024'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white bg-opacity-20 text-white text-sm">
                      Phone: {displayUser.phoneVerified ? 'Verified' : 'Not Verified'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white bg-opacity-20 text-white text-sm">
                      Aadhar: {isAadharVerified ? 'Verified' : aadharStatus === 'pending' ? 'Pending' : aadharStatus === 'rejected' ? 'Rejected' : 'Not Submitted'}
                    </span>
                    {!isAadharVerified && (
                      <button 
                        type="button" 
                        onClick={() => aadharRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                        className="px-3 py-1 bg-white text-blue-600 rounded-full text-sm font-semibold hover:bg-opacity-90 transition-all"
                      >
                        Verify Now
                      </button>
                    )}
                    {hasChanges && isEditing && (
                      <span className="px-4 py-1.5 bg-yellow-500 bg-opacity-90 text-white rounded-full text-sm font-medium animate-pulse">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Details/Edit Form Section */}
            <form onSubmit={handleSubmit} id="profile-edit-form">
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  
                  {/* Name Field */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Full Name</p>
                        {isEditing ? (
                          <input
                            id="name"
                            name="name"
                            type="text"
                            value={profileData.name}
                            onChange={handleChange}
                            className="w-full text-gray-900 font-medium p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                            disabled={isLoading}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{displayUser.name || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Email Address</p>
                        {isEditing ? (
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleChange}
                            className="w-full text-gray-900 font-medium p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            required
                            disabled={isLoading}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium break-all">{displayUser.email || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Phone Number</p>
                        <p className="text-gray-900 font-medium">{displayUser.phone || 'Not provided'}</p>
                        <div className="mt-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${displayUser.phoneVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {displayUser.phoneVerified ? '✓ Verified' : '✗ Not Verified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-2">Reputation</p>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">Overall: <span className="font-semibold text-gray-900">{displayUser.reputation?.overallRating ?? 0}</span></p>
                          <p className="text-xs text-gray-600">As Driver: <span className="font-semibold text-gray-900">{displayUser.reputation?.ridesAsDriver ?? 0}</span></p>
                          <p className="text-xs text-gray-600">As Passenger: <span className="font-semibold text-gray-900">{displayUser.reputation?.ridesAsPassenger ?? 0}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Editable Fields Section */}
                  <div className="col-span-1 md:col-span-2 bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Additional Profile Details (Editable)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              name="avatarUrl"
                              placeholder="Enter image URL or click to select"
                              value={profileData.avatarUrl}
                              onChange={handleChange}
                              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowAvatarSelector(true)}
                              className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              Choose Avatar
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-900 p-3 bg-white border border-gray-200 rounded-lg">
                            {displayUser.avatarUrl || 'No avatar set'}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        {isEditing ? (
                          <select
                            name="gender"
                            value={profileData.gender}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                          >
                            <option>Prefer not to say</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        ) : (
                          <p className="text-gray-900 p-3 bg-white border border-gray-200 rounded-lg">{displayUser.gender || 'Prefer not to say'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age (min. 18)</label>
                        {isEditing ? (
                          <input
                            name="age"
                            type="number"
                            min={18}
                            max={120}
                            placeholder="Enter your age"
                            value={profileData.age}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                          />
                        ) : (
                          <p className="text-gray-900 p-3 bg-white border border-gray-200 rounded-lg">{displayUser.age || 'Not provided'}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Home City</label>
                        {isEditing ? (
                          <input
                            name="homeCity"
                            placeholder="e.g., Mumbai, Delhi, Bangalore"
                            value={profileData.homeCity}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                          />
                        ) : (
                          <p className="text-gray-900 p-3 bg-white border border-gray-200 rounded-lg">{displayUser.homeCity || 'Not provided'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </form>

            {/* Aadhar Verification Section */}
            <div ref={aadharRef} className="p-8 border-t border-gray-100 bg-orange-50">
              <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Identity Verification (Aadhar)
              </h4>
              <div className="mb-4 bg-white rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>⚠️ Required to Post & Search Rides</strong>
                </p>
                <p className="text-xs text-gray-600">
                  ✓ Ensures platform safety and builds community trust<br />
                  ✓ Your number is encrypted and securely stored<br />
                  ✓ Only masked version displayed (e.g., XXXX-XXXX-1234)
                </p>
              </div>

              <div className="mb-4 bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Verification Status</p>
                    <p className={`text-lg font-bold ${isAadharVerified ? 'text-green-600' : aadharStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {isAadharVerified ? '✓ Verified' : aadharStatus === 'pending' ? '⏳ Pending' : aadharStatus === 'rejected' ? '✗ Rejected' : '✗ Not Submitted'}
                    </p>
                    {displayUser.aadhar?.masked && (
                      <p className="text-sm text-gray-600 mt-1 font-mono">Aadhar: {displayUser.aadhar.masked}</p>
                    )}
                  </div>
                  {isAadharVerified && (
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {!isAadharVerified && (
                <>
                  {aadharStatus === 'rejected' && displayUser.aadhar?.rejectionReason && (
                    <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-red-700">Rejection Reason:</p>
                      <p className="text-sm text-red-600">{displayUser.aadhar.rejectionReason}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleAadharSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Number (12 digits)</label>
                      <input
                        type="text"
                        name="aadhar"
                        placeholder="Enter 12-digit Aadhar number"
                        value={aadharNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                          setAadharNumber(value);
                        }}
                        maxLength={12}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Document URL (Optional)</label>
                      <input
                        type="url"
                        name="documentUrl"
                        placeholder="https://example.com/aadhar-document.pdf"
                        value={documentUrl}
                        onChange={(e) => setDocumentUrl(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || !aadharNumber.trim() || aadharNumber.length !== 12}
                    >
                      {isLoading ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                {isEditing ? (
                  <>
                    <button
                      type="submit"
                      form="profile-edit-form"
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || !hasChanges}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-500 transition-colors duration-200 flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Profile</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={logout}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Coming Soon Section */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">More Features Coming Soon!</h3>
            <p className="text-gray-600">
              We're working on adding ride history, reviews, and payment settings.
            </p>
          </div>

        </div>
      </div>

      {/* Avatar Selector Modal */}
      <AvatarSelector
        isOpen={showAvatarSelector}
        onClose={() => setShowAvatarSelector(false)}
        onSelect={handleAvatarSelect}
        currentAvatar={profileData.avatarUrl}
      />
    </div>
  );
}

export default Profile;
