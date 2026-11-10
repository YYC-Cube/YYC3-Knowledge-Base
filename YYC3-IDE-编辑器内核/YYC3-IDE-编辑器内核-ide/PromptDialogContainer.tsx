/**
 * @file: PromptDialogContainer.tsx
 * @description: 非阻塞式输入对话框容器 — 替代原生 prompt()
 * @author: YanYuCloudCube Team <admin@0379.email>
 * @version: v1.0.0
 * @created: 2026-04-17
 * @updated: 2026-04-17
 * @status: dev
 * @license: MIT
 * @copyright: Copyright (c) 2026 YanYuCloudCube Team
 * @tags: component,prompt,dialog,ux
 */

import React, { useState, useEffect, useRef } from "react";
import { usePromptStore } from "./stores/usePromptStore";

export function PromptDialogContainer() {
  const dialogs = usePromptStore((s) => s.dialogs);

  if (dialogs.length === 0) return null;

  return (
    <>
      {dialogs.map((d) => (
        <PromptDialogItem key={d.id} dialog={d} />
      ))}
    </>
  );
}

function PromptDialogItem({ dialog }: { dialog: import("./stores/usePromptStore").PromptDialog }) {
  const resolveDialog = usePromptStore((s) => s.resolveDialog);
  const [value, setValue] = useState(dialog.defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = () => {
    if (dialog.pattern && !dialog.pattern.test(value)) {
      setError(dialog.patternError ?? "输入格式不正确");
      return;
    }
    resolveDialog(dialog.id, value || null);
  };

  const handleCancel = () => {
    resolveDialog(dialog.id, null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={dialog.title}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <div
        className="relative z-10 w-[380px] rounded-lg border border-[var(--ide-border)] bg-[var(--ide-bg-primary)] shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--ide-text-primary)]">
            {dialog.title}
          </h3>
          {dialog.message && (
            <p className="mt-1 text-xs text-[var(--ide-text-muted)]">
              {dialog.message}
            </p>
          )}
        </div>

        <div className="px-5 pb-3">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder={dialog.placeholder}
            className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg-secondary)] px-3 py-2 text-sm text-[var(--ide-text-primary)] placeholder:text-[var(--ide-text-muted)] outline-none focus:border-[var(--ide-accent)] focus:ring-1 focus:ring-[var(--ide-accent)] transition-colors"
          />
          {error && (
            <p className="mt-1 text-xs text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--ide-border)]">
          <button
            onClick={handleCancel}
            className="rounded px-3 py-1.5 text-xs text-[var(--ide-text-muted)] hover:bg-[var(--ide-bg-hover)] transition-colors"
          >
            {dialog.cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="rounded bg-[var(--ide-accent)] px-3 py-1.5 text-xs text-white hover:opacity-90 transition-opacity"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
