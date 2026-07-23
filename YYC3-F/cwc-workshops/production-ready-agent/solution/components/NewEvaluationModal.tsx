"use client";
import { useState } from "react";
import { BookMarked, Loader2, Plus, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { ApiHint, ErrorBlock } from "./ui";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/lib/types";

export const OUTCOME_PROMPT =
  "A committee-ready thesis: each of Acme Robotics, Bridgewell Dynamics, and " +
  "Norwood Automation has a clear PURSUE/HOLD/PASS verdict with IRR and rationale; " +
  "key risks named; prior-deal lessons applied.";

export const QUICK_PROMPT =
  "Give me a quick read on Acme Robotics from the mounted financials, no need to " +
  "delegate or grade anything.";

export function NewEvaluationModal({
  open,
  onOpenChange,
  onCreated,
  onToast,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (s: SessionSummary) => void;
  onToast: (msg: string) => void;
}) {
  const [mcp, setMcp] = useState(true);
  const [memory, setMemory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mcp, memory }),
    });
    setBusy(false);
    if (!res.ok) {
      // Persist the error inline so workshop stubs (501s) are obvious.
      // Toast as a secondary signal — it auto-clears.
      setError(`POST /api/sessions → ${res.status}\n${await res.text()}`);
      onToast(`create failed (${res.status})`);
      return;
    }
    onCreated(await res.json());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex items-center justify-between">
          <DialogTitle className="font-serif text-2xl font-semibold">New Session</DialogTitle>
          <ApiHint>POST /v1/sessions</ApiHint>
        </div>
        <DialogDescription className="text-[12px] text-muted-foreground">
          Spin up a fresh deal-team agent. You can prompt it after the session is created.
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-2">
          <Toggle
            icon={<Zap className="h-4 w-4" />}
            label="Linear via MCP"
            hint="Attach vault credentials for ticket lookup"
            value={mcp}
            onChange={setMcp}
          />
          <Toggle
            icon={<BookMarked className="h-4 w-4" />}
            label="Memory store"
            hint="Mount prior-deal lessons read-only at /mnt/memory"
            value={memory}
            onChange={setMemory}
          />
        </div>
        {error && <ErrorBlock message={error} className="mt-4" />}
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} disabled={busy} size="lg">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy ? "Creating session…" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition",
        value ? "border-foreground/20 bg-secondary" : "hover:bg-secondary/40",
      )}
    >
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="font-serif text-[15px] font-semibold">{label}</div>
        <div className="text-[12px] text-muted-foreground">{hint}</div>
      </div>
      <div
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          value ? "bg-foreground" : "bg-border",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all",
            value ? "left-[18px]" : "left-0.5",
          )}
        />
      </div>
    </button>
  );
}
