import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser as loginAPI, signupUser as signupAPI, getProfile as getProfileAPI } from '../services/authService';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          // Prefer fresh profile from server when token exists
          try {
            getProfileAPI().then((res) => {
              if (res && res.user) {
                setUser(res.user);
                console.log('✅ User session refreshed from API');
              } else {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.log('✅ User session restored from localStorage');
              }
            }).catch((err) => {
              console.warn('⚠️ Could not refresh profile, falling back to local user');
              try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
              } catch (e) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
              }
            });
          } catch (e) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('❌ Failed to parse stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setError('Failed to restore session');
      } finally {
        setLoading(false);
      }
    };

    // Listen for login event from Login component
    const handleUserLoggedIn = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('✅ User context updated after login');
        } catch (error) {
          console.error('❌ Failed to update user context:', error);
        }
      }
    };

    initializeAuth();
    window.addEventListener('userLoggedIn', handleUserLoggedIn);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  const login = useCallback(async (credentials) => {
  try {
    setLoading(true);
    setError(null);

    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    console.log('🔄 Logging in with:', { email: credentials.email });
    
    const response = await loginAPI(credentials);
    
    console.log('📦 Login API response:', response);
    
    // ✅ FIX: Handle the 'success' field from backend
    if (response.success === false) {
      throw new Error(response.message || 'Login failed');
    }
    
    // Extract token and user from response
    const token = response.token;
    const userData = response.user;
    
    if (!token) {
      console.error('❌ No token in response:', response);
      throw new Error('No authentication token received');
    }
    
    console.log('✅ Login successful with token');
    
    // Save both token and user
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    setUser(userData);
    
    return { success: true, user: userData, token };
  } catch (err) {
    const errorMessage = err.response?.data?.message || err.message || 'Login failed';
    setError(errorMessage);
    console.error('❌ Login error:', err);
    
    // Clear storage on error
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
}, []);

  const signup = useCallback(async (details) => {
    try {
      setLoading(true);
      setError(null);

      if (!details.name || !details.email || !details.password) {
        throw new Error('Name, email, and password are required');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(details.email)) {
        throw new Error('Invalid email format');
      }

      console.log('🔄 Signing up with:', { name: details.name, email: details.email });
      
      const response = await signupAPI(details);
      
      console.log('📦 Signup API response:', response);
      
      // Extract token and user from response
      const token = response.token || response.data?.token;
      const userData = response.user || response.data?.user || response;
      
      if (!token) {
        console.error('❌ No token in response:', response);
        throw new Error('No authentication token received');
      }
      
      console.log('✅ Signup successful with token');
      
      // Save both token and user
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      
      return { success: true, user: userData, token };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Signup failed';
      setError(errorMessage);
      console.error('❌ Signup error:', err);
      
      // Clear storage on error
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      setUser(null);
      setError(null);
      
      // Remove both user and token
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken'); // Old key if exists
      
      console.log('✅ User logged out');
      
      return { success: true };
    } catch (err) {
      console.error('❌ Logout error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // ✅ FIXED: This is the main fix - preserve token when updating user
  const updateUser = useCallback((updatedData) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      // Get the current token - CRITICAL!
      const currentToken = localStorage.getItem('token');
      
      if (!currentToken) {
        console.error('❌ No token found when updating user');
        throw new Error('Authentication token missing. Please log in again.');
      }

      const updatedUser = { 
        ...user, 
        ...updatedData,
        id: updatedData.id || updatedData._id || user.id || user._id,
        updatedAt: new Date().toISOString()
      };
      
      setUser(updatedUser);
      
      // ✅ CRITICAL: Save user data BUT keep the token unchanged
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // Token is already in localStorage, don't touch it!
      
      console.log('✅ User updated successfully');
      console.log('🔑 Token preserved in localStorage');
      
      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update user';
      setError(errorMessage);
      console.error('❌ Update user error:', err);
      return { success: false, error: errorMessage };
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    user,
    login,
    signup,
    logout,
    updateUser,
    loading,
    error,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};