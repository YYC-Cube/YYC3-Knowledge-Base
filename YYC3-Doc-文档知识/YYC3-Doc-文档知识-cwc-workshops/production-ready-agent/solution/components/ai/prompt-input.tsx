"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PromptCtx = createContext<{
  text: string;
  setText: (v: string) => void;
  submit: () => void;
} | null>(null);

export function PromptInput({
  onSubmit,
  className,
  children,
}: {
  onSubmit: (text: string) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    void onSubmit(value);
  };

  return (
    <PromptCtx.Provider value={{ text, setText, submit }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-paper focus-within:ring-2 focus-within:ring-ring",
          className,
        )}
      >
        {children}
      </form>
    </PromptCtx.Provider>
  );
}

export function PromptInputTextarea({
  placeholder = "Ask anything",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const ctx = useContext(PromptCtx)!;
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={ctx.text}
      placeholder={placeholder}
      onChange={(e) => {
        ctx.setText(e.target.value);
        const el = ref.current;
        if (el) {
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 128) + "px";
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          ctx.submit();
        }
      }}
      className={cn(
        "max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 font-sans text-[14px] outline-none placeholder:text-muted-foreground",
        className,
      )}
    />
  );
}

export function PromptInputSubmit({ status = "idle" }: { status?: "idle" | "streaming" }) {
  const ctx = useContext(PromptCtx)!;
  const disabled = !ctx.text.trim();
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition disabled:opacity-40"
      aria-label="Send"
    >
      {status === "streaming" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowUp className="h-4 w-4" />
      )}
    </button>
  );
}
