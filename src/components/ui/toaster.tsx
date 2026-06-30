"use client";

import { useToastStore } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative p-4 w-80 rounded-md shadow-lg border pointer-events-auto transition-all animate-in slide-in-from-right-full ${
            toast.variant === "destructive"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-background text-foreground"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              {toast.title && <h3 className="font-semibold text-sm">{toast.title}</h3>}
              {toast.description && (
                <p className="text-sm opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
