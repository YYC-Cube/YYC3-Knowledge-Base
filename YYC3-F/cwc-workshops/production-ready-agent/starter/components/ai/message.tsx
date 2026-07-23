"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ClaudeSpark } from "@/components/ClaudeSpark";
import { cn } from "@/lib/utils";

// ~20 lines of prose at 15px/relaxed.
const COLLAPSE_PX = 440;

type Role = "user" | "assistant";

export function Message({
  from,
  agent,
  className,
  children,
}: {
  from: Role;
  agent?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full gap-3",
        from === "user" ? "justify-end" : "justify-start",
        className,
      )}
    >
      {from === "assistant" && <MessageAvatar name={agent} />}
      {children}
    </div>
  );
}

export function MessageContent({
  from,
  className,
  children,
}: {
  from: Role;
  className?: string;
  children: ReactNode;
}) {
  if (from === "user") {
    return (
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl bg-foreground px-4 py-2.5 text-[14px] text-background",
          className,
        )}
      >
        {children}
      </div>
    );
  }
  return (
    <CollapsibleContent
      className={cn("max-w-[85%] text-[15px] leading-relaxed text-foreground", className)}
    >
      {children}
    </CollapsibleContent>
  );
}

function CollapsibleContent({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > COLLAPSE_PX + 24);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        style={!open && overflows ? { maxHeight: COLLAPSE_PX } : undefined}
        className="overflow-hidden"
      >
        {children}
      </div>
      {overflows && (
        <>
          {!open && (
            <div className="pointer-events-none absolute inset-x-0 bottom-7 h-16 bg-gradient-to-t from-card to-transparent" />
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
            {open ? "Show less" : "Show more"}
          </button>
        </>
      )}
    </div>
  );
}

export function MessageAvatar({ name }: { name?: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
        <ClaudeSpark className="h-4 w-4 text-primary" />
      </div>
      {name && (
        <span className="max-w-[80px] truncate font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {name}
        </span>
      )}
    </div>
  );
}
