"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, EmptyState, ErrorBlock } from "./ui";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { NewEvaluationModal } from "./NewEvaluationModal";
import type { SessionSummary } from "@/lib/types";

export function PipelineRail({
  sessions,
  error,
  selected,
  onCreated,
  onToast,
}: {
  sessions: SessionSummary[];
  error?: string;
  selected?: string;
  onCreated: (s: SessionSummary) => void;
  onToast: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Panel
      title="Deal Pipeline"
      hint="GET /v1/sessions"
      action={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      }
    >
      {error ? (
        <ErrorBlock message={error} className="m-4" />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8" strokeWidth={1} />}
          title="No evaluations yet."

        />
      ) : (
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-3">
            {sessions.map((s, i) => (
              <SessionCard key={s.id} s={s} index={i} active={s.id === selected} />
            ))}
          </div>
        </ScrollArea>
      )}
      <NewEvaluationModal open={open} onOpenChange={setOpen} onCreated={onCreated} onToast={onToast} />
    </Panel>
  );
}

const MotionLink = motion.create(Link);

function SessionCard({ s, index, active }: { s: SessionSummary; index: number; active: boolean }) {
  return (
    <MotionLink
      href={`/session/${s.id}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4), ease: "easeOut" }}
      className={cn(
        "block w-full rounded-xl border p-4 text-left transition-all",
        active
          ? "border-foreground/15 bg-card shadow-paper"
          : "border-transparent hover:border-border hover:bg-secondary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="line-clamp-2 text-[13px] font-medium leading-snug">{s.title || s.id}</div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {relTime(s.created_at)}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Badge variant={s.status === "running" ? "running" : "idle"} pulse={s.status === "running"}>
          {s.status}
        </Badge>
      </div>
    </MotionLink>
  );
}

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
}
