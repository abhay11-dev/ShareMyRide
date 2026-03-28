import React, { useState, useEffect } from 'react';
import { setToastCallback } from '../utils/toast';

export default function Toast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Register global callback
    setToastCallback((payload) => {
      setToast({ ...payload, id: Date.now() });
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const { message, type } = toast;

  const bg = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className={`max-w-sm text-white rounded-lg shadow-lg p-4 ${bg}`}> 
        <div className="text-sm font-medium">{message}</div>
      </div>
    </div>
  );
}
