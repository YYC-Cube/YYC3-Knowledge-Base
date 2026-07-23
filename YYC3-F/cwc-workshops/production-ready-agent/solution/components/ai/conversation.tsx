"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function Conversation({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>{children}</div>;
}

export function ConversationContent({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Radix ScrollArea renders the actual scrollable node as the viewport child.
  const viewport = () =>
    rootRef.current?.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");

  useEffect(() => {
    const vp = viewport();
    if (vp && atBottom) vp.scrollTo({ top: vp.scrollHeight });
  }, [children, atBottom]);

  useEffect(() => {
    const vp = viewport();
    if (!vp) return;
    const onScroll = () => {
      setAtBottom(vp.scrollHeight - vp.scrollTop - vp.clientHeight < 40);
    };
    vp.addEventListener("scroll", onScroll);
    return () => vp.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = () => {
    const vp = viewport();
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  };

  return (
    <div ref={rootRef} className="relative min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-6 p-6">{children}</div>
      </ScrollArea>
      <ConversationScrollButton show={!atBottom} onClick={scrollToBottom} />
    </div>
  );
}

export function ConversationScrollButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border bg-card shadow-paper transition hover:bg-secondary"
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
}

export function ConversationEmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h3 className="font-serif text-xl font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
