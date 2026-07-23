"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ClipboardCheck, Loader2, MessageSquare, ShieldQuestion, Wrench, X } from "lucide-react";
import { ClaudeSpark } from "@/components/ClaudeSpark";
import { cn } from "@/lib/utils";
import { Panel, EmptyState, ApiHint, ErrorBlock } from "@/components/ui";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import { Response } from "@/components/ai/response";
import { Badge } from "@/components/ui/badge";
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from "@/components/ai/prompt-input";
import { toChatMessages } from "@/lib/chat";
import { OUTCOME_PROMPT, QUICK_PROMPT } from "@/components/NewEvaluationModal";
import type { StreamEvent } from "@/lib/types";

interface Props {
  sessionId?: string;
  onEventCount?: (n: number) => void;
  onToast?: (msg: string) => void;
}

interface Thread {
  id: string;
  name: string;
  model?: string;
}

export function ChatPanel({ sessionId, onEventCount, onToast }: Props) {
  const params = useParams<{ threadId?: string }>();
  const activeThread = params.threadId ?? null;
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const [kind, setKind] = useState<"message" | "outcome">("message");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadEvents, setThreadEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  // Last failed steer (e.g. a workshop stub 501). Shown under the textbox so
  // the input itself reflects the unwired state. Clears after a successful send.
  const [steerError, setSteerError] = useState<string>();

  // Primary stream: always open, drives status + the coordinator chat view.
  useEffect(() => {
    setEvents([]);
    setStatus("idle");
    setLoading(true);
    if (!sessionId) return;

    const es = new EventSource(`/api/stream/${sessionId}`);
    const seen = new Set<string>();
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data) as StreamEvent;
      if (ev.type === "_ready") return setLoading(false);
      if (seen.has(ev.id)) return;
      seen.add(ev.id);
      setEvents((prev) => [...prev, ev]);
      // The stream is broken (or, in the starter app, not implemented yet).
      // Stop EventSource from auto-reconnecting every ~3s; switch sessions
      // or refresh to retry.
      if (ev.type === "error") {
        setLoading(false);
        es.close();
        return;
      }
      if (ev.type === "session.status_running") setStatus("streaming");
      if (ev.type === "session.status_idle" || ev.type === "session.status_terminated")
        setStatus("idle");
    };
    return () => es.close();
  }, [sessionId]);

  // Sub-agent threads spawn while the coordinator delegates. Poll the
  // ListSessionThreads endpoint and render a tab per thread.
  useEffect(() => {
    setThreads([]);
    if (!sessionId) return;
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/session/${sessionId}/threads`).catch(() => null);
      if (stop || !res?.ok) return;
      setThreads(await res.json());
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [sessionId]);

  // Surface the event count to the parent (right rail). Done in an effect, not
  // inside the setEvents updater, so we never call a parent setState mid-render.
  useEffect(() => {
    onEventCount?.(events.length);
  }, [events.length, onEventCount]);

  // Per-thread stream: opened only while a sub-agent tab is active.
  useEffect(() => {
    setThreadEvents([]);
    if (!sessionId || !activeThread) return;
    setThreadLoading(true);
    const es = new EventSource(`/api/stream/${sessionId}/thread/${activeThread}`);
    const seen = new Set<string>();
    es.onmessage = (e) => {
      const ev = JSON.parse(e.data) as StreamEvent;
      if (ev.type === "_ready") return setThreadLoading(false);
      if (seen.has(ev.id)) return;
      seen.add(ev.id);
      setThreadEvents((prev) => [...prev, ev]);
    };
    return () => es.close();
  }, [sessionId, activeThread]);

  const activeName = threads.find((t) => t.id === activeThread)?.name;
  const messages = activeThread
    ? toChatMessages(threadEvents, activeName)
    : toChatMessages(events);
  const isLoading = activeThread ? threadLoading : loading;

  // POST to a route handler; returns the error text on failure (undefined on
  // success). On failure, also appends a synthetic error event so it persists
  // in the chat and toasts a short summary. This is how workshop stubs surface
  // their 501 "not implemented yet" state.
  const post = async (path: string, body: unknown) => {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return undefined;
    const error = `${path} → ${res.status}\n${await res.text()}`;
    onToast?.(error.replace(/\n.*/s, "").trim());
    setEvents((prev) => [...prev, { id: `err-${Date.now()}`, type: "error", error } as StreamEvent]);
    return error;
  };

  const send = async (text: string, k: "message" | "outcome" = kind) => {
    if (!sessionId) return;
    setSteerError(await post(`/api/steer/${sessionId}`, { text, kind: k }));
    setKind("message");
  };

  const confirm = async (toolUseId: string, result: "allow" | "deny") => {
    if (!sessionId) return;
    await post(`/api/confirm/${sessionId}`, { tool_use_id: toolUseId, result });
  };

  return (
    <Panel
      title="Chat"
      hint={
        activeThread
          ? "GET /v1/sessions/{id}/threads/{tid}/events/stream"
          : "GET /v1/sessions/{id}/events/stream"
      }
      className="h-full"
    >
      {!sessionId ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="Select a session to start chatting."
        />
      ) : (
        <div className="flex h-full flex-col">
          {(threads.length > 0 || activeThread) && (
            <ThreadTabs sessionId={sessionId} threads={threads} active={activeThread} />
          )}
          <Conversation>
            <ConversationContent>
              {isLoading && messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <ConversationEmptyState
                  icon={<ClaudeSpark className="h-7 w-7 text-primary" />}
                  title="Ask about a deal"
                  description="The agent will research targets and draft a thesis."
                >
                  <div className="mt-2 flex max-w-md flex-col gap-2">
                    <SuggestionChip
                      kind="outcome"
                      text={OUTCOME_PROMPT}
                      onClick={() => send(OUTCOME_PROMPT, "outcome")}
                    />
                    <SuggestionChip text={QUICK_PROMPT} onClick={() => send(QUICK_PROMPT)} />
                  </div>
                </ConversationEmptyState>
              ) : (
                messages.map((m) =>
                  m.error ? (
                    <ErrorBlock key={m.id} message={m.error} className="max-w-[85%]" />
                  ) : m.marker ? (
                    <MarkerLine key={m.id} type={m.marker} agent={m.agent} />
                  ) : m.confirm ? (
                    <ToolConfirm
                      key={m.id}
                      agent={m.agent}
                      name={m.tool!}
                      input={m.confirm.input}
                      resolved={m.confirm.resolved}
                      onAllow={() => confirm(m.id, "allow")}
                      onDeny={() => confirm(m.id, "deny")}
                    />
                  ) : m.tool ? (
                    <ToolLine key={m.id} name={m.tool} />
                  ) : m.outcome ? (
                    <OutcomeLine key={m.id} from={m.role} {...m.outcome} />
                  ) : (
                    <Message key={m.id} from={m.role} agent={m.agent}>
                      <MessageContent from={m.role}>
                        {m.role === "assistant" ? <Response>{m.text}</Response> : m.text}
                      </MessageContent>
                    </Message>
                  ),
                )
              )}
            </ConversationContent>
          </Conversation>
          {activeThread === null && (
            <div className="space-y-2 border-t p-4">
              {steerError ? (
                <ErrorBlock message={steerError} />
              ) : (
                <ApiHint>{"POST /v1/sessions/{id}/events"}</ApiHint>
              )}
              <PromptInput onSubmit={(t) => send(t)}>
                <KindToggle value={kind} onChange={setKind} />
                <PromptInputTextarea
                  className={cn(steerError && "placeholder:text-destructive/70")}
                  placeholder={
                    steerError
                      ? steerError.split("\n").pop()
                      : kind === "outcome"
                        ? "Describe the outcome to grade against..."
                        : "Ask about Acme, Bridgewell, or Norwood..."
                  }
                />
                <PromptInputSubmit status={status} />
              </PromptInput>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function ThreadTabs({
  sessionId,
  threads,
  active,
}: {
  sessionId: string;
  threads: Thread[];
  active: string | null;
}) {
  const all: { id: string | null; name: string }[] = [
    { id: null, name: "coordinator" },
    ...threads,
  ];
  // If we deep-linked to a thread before the primary stream discovered it.
  if (active && !threads.some((t) => t.id === active)) all.push({ id: active, name: active });
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 py-2">
      {all.map((t) => (
        <Link
          key={t.id ?? "primary"}
          href={t.id ? `/session/${sessionId}/thread/${t.id}` : `/session/${sessionId}`}
          scroll={false}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] transition",
            active === t.id
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-secondary",
          )}
        >
          {t.name}
        </Link>
      ))}
    </div>
  );
}

function SuggestionChip({
  text,
  kind = "message",
  onClick,
}: {
  text: string;
  kind?: "message" | "outcome";
  onClick: () => void;
}) {
  const isOutcome = kind === "outcome";
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-card px-4 py-3 text-left text-[13px] leading-snug shadow-paper transition hover:border-foreground/20",
        isOutcome ? "border-dashed border-foreground/25" : "text-foreground/80",
      )}
    >
      {isOutcome && (
        <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <ClipboardCheck className="h-3 w-3" />
          user.define_outcome
        </span>
      )}
      {text}
    </button>
  );
}

function KindToggle({
  value,
  onChange,
}: {
  value: "message" | "outcome";
  onChange: (v: "message" | "outcome") => void;
}) {
  const opts = [
    { v: "message" as const, icon: MessageSquare, label: "Message" },
    { v: "outcome" as const, icon: ClipboardCheck, label: "Outcome" },
  ];
  return (
    <div className="flex shrink-0 rounded-full bg-secondary p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          title={o.label}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            value === o.v ? "bg-card text-foreground shadow-paper" : "text-muted-foreground",
          )}
        >
          <o.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function ToolConfirm({
  agent,
  name,
  input,
  resolved,
  onAllow,
  onDeny,
}: {
  agent?: string;
  name: string;
  input: unknown;
  resolved?: "allow" | "deny";
  onAllow: () => void;
  onDeny: () => void;
}) {
  const [local, setLocal] = useState<"allow" | "deny">();
  const r = resolved ?? local;
  const act = (result: "allow" | "deny", fn: () => void) => {
    setLocal(result);
    fn();
  };
  const arg =
    typeof input === "object" && input ? JSON.stringify(input, null, 2) : String(input ?? "");
  return (
    <div className="ml-10 w-full max-w-[85%] min-w-0 rounded-xl border bg-card p-4 shadow-paper">
      <div className="flex items-center gap-2">
        <ShieldQuestion className="h-4 w-4 text-primary" />
        <span className="font-mono text-[11px] text-foreground/70">
          {agent} wants to run <span className="font-semibold text-foreground">{name}</span>
        </span>
      </div>
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-secondary p-2 font-mono text-[11px]">
        {arg}
      </pre>
      {r ? (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 font-mono text-[11px]",
            r === "allow" ? "text-accent" : "text-primary",
          )}
        >
          {r === "allow" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {r === "allow" ? "allowed" : "denied"}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => act("allow", onAllow)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 font-mono text-[11px] text-background transition hover:opacity-90"
          >
            <Check className="h-3.5 w-3.5" /> Allow
          </button>
          <button
            onClick={() => act("deny", onDeny)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" /> Deny
          </button>
        </div>
      )}
    </div>
  );
}

function ToolLine({ name }: { name: string }) {
  return (
    <div className="ml-10 inline-flex items-center gap-1.5 self-start rounded-full bg-secondary px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
      <Wrench className="h-3 w-3" />
      <span>{name}</span>
    </div>
  );
}

function OutcomeLine({
  from,
  result,
  explanation,
}: {
  from: "user" | "assistant";
  result: string;
  explanation?: string;
}) {
  const isDefine = from === "user";
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-xl border p-3",
        isDefine
          ? "ml-auto border-dashed border-foreground/25 bg-card"
          : "ml-10 bg-secondary/40",
      )}
    >
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {isDefine ? "user.define_outcome" : "outcome evaluation"}
        </span>
        {!isDefine && <Badge variant={result as never}>{result}</Badge>}
      </div>
      {explanation && (
        <p className="mt-2 text-[13px] leading-snug text-foreground/75">{explanation}</p>
      )}
    </div>
  );
}

function MarkerLine({ type, agent }: { type: string; agent?: string }) {
  return (
    <div className="ml-10 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
      <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
      <span>{type}</span>
      {agent && <span className="text-muted-foreground/70">{agent}</span>}
    </div>
  );
}

