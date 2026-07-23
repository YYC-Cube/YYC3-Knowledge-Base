"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { TopBar } from "./TopBar";
import { PipelineRail } from "./PipelineRail";
import { ChatPanel } from "./ChatPanel";
import { SessionRail } from "./SessionRail";
import type { SessionSummary } from "@/lib/types";

export function DealDesk({ sessionId }: { sessionId?: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsError, setSessionsError] = useState<string>();
  const [eventCount, setEventCount] = useState(0);
  const [toast, setToast] = useState<string>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(undefined), 3500);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (!res.ok) {
      // Persist so the rail shows what's broken (e.g. a workshop stub 501).
      // Polling keeps retrying — fix the route and it clears on the next tick.
      setSessionsError(`GET /api/sessions → ${res.status}\n${await res.text()}`);
      return;
    }
    setSessionsError(undefined);
    const data: SessionSummary[] = await res.json();
    setSessions(data);
    if (!sessionId && data[0]) router.replace(`/session/${data[0].id}`);
  }, [sessionId, router]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  // Reset live event counter when navigating between sessions.
  useEffect(() => {
    setEventCount(0);
  }, [sessionId]);

  function onCreated(s: SessionSummary) {
    setSessions((prev) => [s, ...prev]);
    router.push(`/session/${s.id}`);
  }

  return (
    <main className="mx-auto flex h-screen max-w-[1720px] flex-col gap-5 p-6">
      <TopBar />
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr_360px] gap-5">
        <PipelineRail
          sessions={sessions}
          error={sessionsError}
          selected={sessionId}
          onCreated={onCreated}
          onToast={showToast}
        />
        <ChatPanel sessionId={sessionId} onEventCount={setEventCount} onToast={showToast} />
        <SessionRail sessionId={sessionId} eventCount={eventCount} onToast={showToast} />
      </div>
      <p className="text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        Acme Robotics, Bridgewell Dynamics, Norwood Automation and all data depicted are fictitious
        and used for demonstration purposes only.
      </p>
      {/* Wrapper centers the pill; motion sets its own transform so we can't rely on translate-x. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-7 z-[60] flex justify-center px-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto max-w-xl truncate rounded-full border border-background/10 bg-foreground px-5 py-2.5 font-mono text-xs text-background shadow-paper-lg"
              title={toast}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
