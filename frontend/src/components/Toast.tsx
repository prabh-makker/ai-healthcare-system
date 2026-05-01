"use strict";
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const success = (message: string, title?: string) => toast(message, "success", title);
  const error = (message: string, title?: string) => toast(message, "error", title);
  const info = (message: string, title?: string) => toast(message, "info", title);
  const warning = (message: string, title?: string) => toast(message, "warning", title);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "pointer-events-auto flex w-full items-start gap-4 rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all",
                t.type === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
                t.type === "error" && "border-rose-500/20 bg-rose-500/10 text-rose-500",
                t.type === "info" && "border-sky-500/20 bg-sky-500/10 text-sky-500",
                t.type === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-500"
              )}
            >
              <div className="mt-0.5">
                {t.type === "success" && <CheckCircle className="h-5 w-5" />}
                {t.type === "error" && <AlertCircle className="h-5 w-5" />}
                {t.type === "info" && <Info className="h-5 w-5" />}
                {t.type === "warning" && <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1 space-y-1">
                {t.title && <p className="text-sm font-semibold leading-none">{t.title}</p>}
                <p className="text-sm leading-relaxed opacity-90">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="rounded-lg p-1 opacity-50 hover:opacity-100 hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
