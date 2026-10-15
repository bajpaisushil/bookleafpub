"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; message: string; tone: "success" | "error" };

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((all) => [...all, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1",
              toast.tone === "success"
                ? "bg-stone-900 text-white ring-stone-900"
                : "bg-white text-red-800 ring-red-200",
            )}
          >
            {toast.tone === "success" ? (
              <CircleCheck className="size-4 shrink-0 text-emerald-400" aria-hidden />
            ) : (
              <CircleAlert className="size-4 shrink-0" aria-hidden />
            )}
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
