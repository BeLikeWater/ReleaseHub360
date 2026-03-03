// ═══════════════════════════════════════════════
// Toast / Snackbar System
// Zustand store + SnackbarProvider component
// ═══════════════════════════════════════════════
// Kullanım:
//   import { useToast } from '@/store/toastStore';
//   const toast = useToast();
//   toast.success('Kaydedildi');
//   toast.error('Bir hata oluştu');
//   toast.warning('Dikkat!');
//   toast.info('Bilginize');

import { create } from 'zustand';

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  /** Add a toast */
  addToast: (message: string, severity: ToastSeverity, duration?: number) => void;
  /** Remove a toast by id */
  removeToast: (id: number) => void;
  /** Convenience shortcuts */
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

let _nextId = 0;

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, severity, duration = 4000) => {
    const id = ++_nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, severity, duration }] }));
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  success: (message) => {
    const id = ++_nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, severity: 'success' }] }));
  },

  error: (message) => {
    const id = ++_nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, severity: 'error', duration: 6000 }] }));
  },

  warning: (message) => {
    const id = ++_nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, severity: 'warning' }] }));
  },

  info: (message) => {
    const id = ++_nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, severity: 'info' }] }));
  },
}));
