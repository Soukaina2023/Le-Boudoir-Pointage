import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '../types';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return { toasts, toast };
}
