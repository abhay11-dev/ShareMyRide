// Example: How to integrate Toast notifications in your app

// Option 1: Using a simple toast library like react-toastify
// First: npm install react-toastify

// In your App.jsx:
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { setToastCallback } from './utils/toast';

function App() {
  useEffect(() => {
    // Set up toast callback for global toast usage
    setToastCallback(({ message, type }) => {
      toast[type](message, {
        position: 'top-right',
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    });
  }, []);

  return (
    <>
      <ToastContainer />
      {/* Rest of your app */}
    </>
  );
}

// ============================================

// Option 2: Using Sonner (Modern toast library)
// First: npm install sonner

// In your App.jsx:
import { Toaster } from 'sonner';
import { setToastCallback } from './utils/toast';

function App() {
  useEffect(() => {
    setToastCallback(({ message, type }) => {
      // Sonner exports: toast.success, toast.error, toast.info, toast.loading
      if (type === 'success') {
        toast.success(message);
      } else if (type === 'error') {
        toast.error(message);
      } else if (type === 'info') {
        toast.info(message);
      } else if (type === 'warning') {
        toast.error(message); // Sonner doesn't have warning, use error
      }
    });
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      {/* Rest of your app */}
    </>
  );
}

// ============================================

// Option 3: Custom Toast Component (Built-in solution)
// Create: src/components/CustomToast.jsx

import React, { useState, useEffect } from 'react';
import { setToastCallback } from '../utils/toast';

export default function CustomToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setToastCallback(({ message, type }) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    });
  }, []);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${bgColor[toast.type]} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in-right`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// Then use in App.jsx:
import CustomToast from './components/CustomToast';

function App() {
  return (
    <>
      <CustomToast />
      {/* Rest of your app */}
    </>
  );
}

// ============================================

// Option 4: If using Chakra UI Toast

import { useToast } from '@chakra-ui/react';
import { setToastCallback } from './utils/toast';

function App() {
  const toast = useToast();

  useEffect(() => {
    setToastCallback(({ message, type }) => {
      toast({
        title: message,
        status: type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info',
        duration: 4000,
        isClosable: true,
        position: 'top-right',
      });
    });
  }, [toast]);

  return (
    <>
      {/* Rest of your app */}
    </>
  );
}
