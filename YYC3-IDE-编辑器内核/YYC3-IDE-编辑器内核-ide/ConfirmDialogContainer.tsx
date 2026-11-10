/**
 * @file: ConfirmDialogContainer.tsx
 * @description: 确认对话框渲染容器，替代 window.confirm()
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: component,confirm,dialog,ux
 */

import { useEffect, useRef } from "react";
import { useConfirmStore, type ConfirmDialog } from "./stores/useConfirmStore";
import { AlertTriangle, Trash2, ShieldAlert, X } from "lucide-react";

function ConfirmDialogItem({ dialog }: { dialog: ConfirmDialog }) {
  const resolveDialog = useConfirmStore((s) => s.resolveDialog);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      confirmRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        resolveDialog(dialog.id, false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [dialog.id, resolveDialog]);

  const variantStyles = {
    danger: {
      icon: <Trash2 className="w-5 h-5 text-red-400" />,
      confirmBtn:
        "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500/50",
      ring: "ring-red-500/20",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      confirmBtn:
        "bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500/50",
      ring: "ring-amber-500/20",
    },
    default: {
      icon: <ShieldAlert className="w-5 h-5 text-blue-400" />,
      confirmBtn:
        "bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500/50",
      ring: "ring-blue-500/20",
    },
  };

  const style = variantStyles[dialog.variant] ?? variantStyles.default;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => resolveDialog(dialog.id, false)}
      />
      <div
        className={`relative w-full max-w-md mx-4 bg-[var(--ide-bg,#1e1e2e)] border border-[var(--ide-border,#333)] rounded-xl shadow-2xl ring-1 ${style.ring} animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start gap-3 p-5">
          <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--ide-text-primary,#e2e8f0)]">
              {dialog.title}
            </h3>
            <p className="mt-2 text-[0.82rem] text-[var(--ide-text-secondary,#94a3b8)] whitespace-pre-line leading-relaxed">
              {dialog.message}
            </p>
          </div>
          <button
            onClick={() => resolveDialog(dialog.id, false)}
            className="flex-shrink-0 p-1 rounded-md text-[var(--ide-text-dim,#64748b)] hover:text-[var(--ide-text-primary,#e2e8f0)] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--ide-border,#333)]">
          <button
            onClick={() => resolveDialog(dialog.id, false)}
            className="px-3.5 py-1.5 rounded-lg text-[0.78rem] text-[var(--ide-text-secondary,#94a3b8)] hover:bg-white/5 border border-[var(--ide-border,#333)] transition-colors focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            {dialog.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => resolveDialog(dialog.id, true)}
            className={`px-3.5 py-1.5 rounded-lg text-[0.78rem] font-medium transition-colors focus:outline-none focus:ring-2 ${style.confirmBtn}`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialogContainer() {
  const dialogs = useConfirmStore((s) => s.dialogs);

  if (dialogs.length === 0) return null;

  return (
    <>
      {dialogs.map((d) => (
        <ConfirmDialogItem key={d.id} dialog={d} />
      ))}
    </>
  );
}
