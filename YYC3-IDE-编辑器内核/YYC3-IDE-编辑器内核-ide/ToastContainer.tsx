/**
 * @file: ToastContainer.tsx
 * @description: Toast 通知容器组件，渲染所有活跃的 Toast 通知
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: ui,toast,notification,container
 */

import React, { useEffect, useState } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useToastStore, type Toast, type ToastType } from "./stores/useToastStore";

const TYPE_CONFIG: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string; bgColor: string; borderColor: string }
> = {
  success: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  info: {
    icon: Info,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const config = TYPE_CONFIG[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`
        flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm
        transition-all duration-200 max-w-sm
        ${config.bgColor} ${config.borderColor}
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
      `}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.color}`} />
      <p className="flex-1 text-sm text-slate-200 leading-relaxed whitespace-pre-line">
        {toast.message}
      </p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5 text-slate-500" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
