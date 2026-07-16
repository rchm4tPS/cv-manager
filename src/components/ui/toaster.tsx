"use client";

import { useToastStore } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, closeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[10060] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative p-4 w-80 rounded-md shadow-lg border pointer-events-auto transition-all duration-300 ${
            toast.isClosing ? "animate-out slide-out-to-right-full fade-out" : "animate-in slide-in-from-right-full fade-in"
          } ${
            toast.variant === "destructive"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : toast.variant === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-background text-foreground"
          } ${toast.className || ""}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              {toast.title && <h3 className="font-semibold text-sm">{toast.title}</h3>}
              {toast.description && (
                <p className="text-sm opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => closeToast(toast.id)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
