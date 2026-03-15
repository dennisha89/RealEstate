"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const icons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: "border-money-800/50 bg-money-900/30",
  error: "border-red-800/50 bg-red-900/30",
  warning: "border-gold-800/50 bg-gold-900/30",
  info: "border-blue-800/50 bg-blue-900/30",
};

const iconColors: Record<ToastType, string> = {
  success: "text-money-400",
  error: "text-red-400",
  warning: "text-gold-400",
  info: "text-blue-400",
};

// Global toast state
let addToastGlobal: ((toast: Omit<Toast, "id">) => void) | null = null;

export function toast(type: ToastType, message: string, duration?: number) {
  addToastGlobal?.({ type, message, duration });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => {
      addToastGlobal = null;
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const Icon = icons[t.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, t.duration || 4000);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${colors[t.type]} shadow-lg animate-slide-up`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColors[t.type]}`} />
      <p className="text-sm text-gray-200 flex-1">{t.message}</p>
      <button
        onClick={onDismiss}
        className="text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
