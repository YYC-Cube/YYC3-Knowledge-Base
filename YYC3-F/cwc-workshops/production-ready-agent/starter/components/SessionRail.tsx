"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Info, Loader2, Trash2 } from "lucide-react";
import { Panel, EmptyState, ErrorBlock } from "./ui";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

function ago(iso?: string) {
  if (!iso) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TOOLSET = ["bash", "read", "write", "edit", "glob", "grep", "web_fetch", "web_search"];

// Flatten the agent.tools[] union into displayable names.
function toolNames(tools?: any[]): string[] {
  return (tools ?? []).flatMap((t) => {
    if (t.type === "agent_toolset_20260401") {
      // configs are overrides; default_config.enabled (default true) applies to the rest.
      const off = new Set(
        (t.configs ?? []).filter((c: any) => c.enabled === false).map((c: any) => c.name),
      );
      const defaultOn = t.default_config?.enabled !== false;
      const on = new Set(
        (t.configs ?? []).filter((c: any) => c.enabled === true).map((c: any) => c.name),
      );
      return TOOLSET.filter((n) => (defaultOn ? !off.has(n) : on.has(n)));
    }
    if (t.type === "mcp_toolset") return [`mcp:${t.mcp_server_name}`];
    return [t.name ?? t.type];
  });
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="pt-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((it) => (
          <span
            key={it}
            className="rounded-full border bg-card px-2 py-0.5 font-mono text-[10px] text-foreground/70"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm tabular-nums">{value ?? "-"}</span>
    </div>
  );
}

export function SessionRail({
  sessionId,
  eventCount,
  onToast,
}: {
  sessionId?: string;
  eventCount: number;
  onToast?: (msg: string) => void;
}) {
  const [session, setSession] = useState<any>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!sessionId) {
      setSession(undefined);
      setError(undefined);
      return;
    }
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/session/${sessionId}`).catch(() => null);
      if (stop) return;
      if (!res || !res.ok) {
        // Persist so the rail shows what's broken (e.g. a workshop stub 501).
        // Polling keeps retrying — fix the route and it clears on the next tick.
        setError(`GET /api/session/{id} → ${res?.status ?? "?"}\n${res ? await res.text() : "fetch failed"}`);
        return;
      }
      setError(undefined);
      setSession(await res.json());
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Panel title="Session">
        <EmptyState icon={<Info className="h-8 w-8" strokeWidth={1} />} title="No session selected." />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Session" hint="GET /v1/sessions/{id}">
        <ErrorBlock message={error} className="m-4" />
      </Panel>
    );
  }

  const status = session?.status ?? "loading";
  const running = status === "running";
  const variant = running ? "running" : status === "idle" ? "idle" : "default";
  const consoleUrl = `https://platform.claude.com/workspaces/${process.env.NEXT_PUBLIC_WORKSPACE_ID}/sessions/${sessionId}`;

  return (
    <Panel title="Session" hint="GET /v1/sessions/{id}">
      <ScrollArea className="h-full">
        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <Badge variant={variant as any} pulse={running} className="px-3 py-1 text-[11px]">
              {status}
            </Badge>
            <p className="break-all font-mono text-[10px] text-muted-foreground">{sessionId}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{ago(session?.created_at)}</p>
          </div>

          <div className="space-y-1 rounded-xl border bg-secondary/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Agent</p>
            <p className="font-serif font-semibold">{session?.agent?.name ?? "-"}</p>
            <p className="break-all font-mono text-[10px] text-muted-foreground">
              {session?.agent?.id}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {session?.agent?.model?.id ?? session?.agent?.model}
            </p>
            <ChipRow label="tools" items={toolNames(session?.agent?.tools)} />
            <ChipRow
              label="mcp"
              items={(session?.agent?.mcp_servers ?? []).map((s: any) => s.name)}
            />
            <ChipRow
              label="skills"
              items={(session?.agent?.skills ?? []).map((s: any) => s.skill_id ?? s.id)}
            />
          </div>

          <div className="space-y-2 rounded-xl border p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Outcomes
            </p>
            {(session?.outcome_evaluations ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No outcomes defined yet.</p>
            ) : (
              session.outcome_evaluations.map((o: any) => (
                <div key={o.outcome_id} className="rounded-lg bg-secondary/60 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={o.result as never}>{o.result}</Badge>
                    {o.iteration != null && (
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                        iter {o.iteration}
                      </span>
                    )}
                  </div>
                  {o.description && (
                    <p className="mt-1.5 line-clamp-3 text-[12px] leading-snug text-foreground/80">
                      {o.description}
                    </p>
                  )}
                </div>
              ))
            )}
            <Stat label="Events" value={eventCount} />
          </div>

          <div className="flex gap-2">
            <a
              href={consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Open in Console
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <DeleteButton sessionId={sessionId} onToast={onToast} />
          </div>
        </div>
      </ScrollArea>
    </Panel>
  );
}

function DeleteButton({ sessionId, onToast }: { sessionId: string; onToast?: (msg: string) => void }) {
  const router = useRouter();
  const [arm, setArm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 3000);
    return () => clearTimeout(t);
  }, [arm]);

  async function go() {
    if (!arm) return setArm(true);
    setBusy(true);
    const res = await fetch(`/api/session/${sessionId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) return router.push("/");
    onToast?.(`DELETE /api/session/{id} → ${res.status}: ${(await res.text()).split("\n")[0]}`);
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-colors",
        arm
          ? "border-primary/40 bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      {arm ? "Confirm?" : "Delete"}
    </button>
  );
}
