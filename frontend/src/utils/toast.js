// src/utils/toast.js
let toastCallback = null;

export const setToastCallback = (callback) => {
  toastCallback = callback;
};

export const showToast = (message, type = 'info') => {
  if (toastCallback) {
    toastCallback({ message, type });
  } else {
    // Fallback to console if no callback
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
};

export const success = (message) => showToast(message, 'success');
export const error = (message) => showToast(message, 'error');
export const info = (message) => showToast(message, 'info');
export const warning = (message) => showToast(message, 'warning');
