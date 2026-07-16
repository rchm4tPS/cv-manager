import { create } from 'zustand';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  isClosing?: boolean;
  duration?: number;
  className?: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'isClosing'>) => void;
  closeToast: (id: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      set((state) => {
        // We can just call the close logic
        const current = state.toasts.find(t => t.id === id);
        if (current && !current.isClosing) {
          setTimeout(() => set(s => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 300);
          return { toasts: state.toasts.map(t => t.id === id ? { ...t, isClosing: true } : t) };
        }
        return state;
      });
    }, toast.duration || 5000);
  },
  closeToast: (id) => {
    set((state) => ({ toasts: state.toasts.map(t => t.id === id ? { ...t, isClosing: true } : t) }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 300); // 300ms matches the animate-out duration
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  return { toast: addToast };
}
