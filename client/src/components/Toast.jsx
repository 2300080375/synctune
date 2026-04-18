// src/components/Toast.jsx
// Simple global toast system via window.showToast(message, type)

import { useState, useEffect, useCallback } from 'react';

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const COLORS = {
  success: 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200',
  error: 'border-red-500/50 bg-red-950/80 text-red-200',
  info: 'border-violet-500/50 bg-violet-950/80 text-violet-200',
  warning: 'border-amber-500/50 bg-amber-950/80 text-amber-200',
};

let _addToast = null;

export const showToast = (message, type = 'info') => {
  if (_addToast) _addToast(message, type);
};

// Also expose globally
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md text-sm font-medium shadow-2xl animate-slideIn pointer-events-auto ${COLORS[toast.type]}`}
          style={{ minWidth: 240, maxWidth: 360 }}
        >
          <span className="text-base flex-shrink-0">{ICONS[toast.type]}</span>
          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}