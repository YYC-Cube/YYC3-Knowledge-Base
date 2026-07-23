import type { StreamEvent } from "@/lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  // which agent emitted this (coordinator or a sub-agent name)
  agent?: string;
  // set when this message represents a tool call rather than prose
  tool?: string;
  // set for passthrough lifecycle events (session.* / span.* / agent.thinking)
  marker?: string;
  // set when this tool call needs user.tool_confirmation before it runs
  confirm?: { input: unknown; resolved?: "allow" | "deny" };
  // set when this message is a grader verdict (span.outcome_evaluation_end)
  outcome?: { result: string; explanation?: string };
  // set for synthetic error events (failed POSTs, broken stream, workshop stubs)
  error?: string;
}

function textOf(e: StreamEvent): string {
  return e.content?.filter((c) => c.type === "text").map((c) => c.text).join("\n") ?? "";
}

// Reduce the raw SSE event stream into a flat list of chat bubbles.
// Tracks thread_id -> agent_name so every agent.* event can be attributed,
// falling back to "coordinator" for the root thread.
export function toChatMessages(events: StreamEvent[], defaultAgent = "coordinator"): ChatMessage[] {
  const threads: Record<string, string> = {};
  const out: ChatMessage[] = [];
  const byId: Record<string, ChatMessage> = {};

  for (const e of events) {
    if (!e?.type) continue;
    const tid = e.thread_id ?? e.from_thread_id ?? e.to_thread_id ?? e.session_thread_id;
    const aname = e.agent_name ?? e.from_agent_name ?? e.to_agent_name;
    if (tid && aname) threads[tid] = aname;
    const agent = aname ?? (tid ? threads[tid] : undefined) ?? defaultAgent;

    if (e.type === "user.message") {
      out.push({ id: e.id, role: "user", text: textOf(e) });
    } else if (e.type === "user.define_outcome") {
      out.push({
        id: e.id,
        role: "user",
        text: "",
        outcome: { result: "defined", explanation: (e as { description?: string }).description },
      });
    } else if (e.type === "agent.message") {
      out.push({ id: e.id, role: "assistant", text: textOf(e), agent });
    } else if (e.type === "agent.thread_message_sent") {
      // This thread is sending to another (delegate down or report up).
      out.push({
        id: e.id,
        role: "assistant",
        text: "",
        agent,
        tool: `→ ${e.to_agent_name ?? "coordinator"}`,
      });
    } else if (e.type === "agent.thread_message_received") {
      // Sub-agent reporting back; render as a message attributed to that agent.
      out.push({ id: e.id, role: "assistant", text: textOf(e), agent: e.from_agent_name });
    } else if (e.type === "agent.tool_use" || e.type === "agent.mcp_tool_use") {
      const m: ChatMessage = { id: e.id, role: "assistant", text: "", agent, tool: e.name ?? e.tool_name };
      if ((e as { evaluated_permission?: string }).evaluated_permission === "ask") {
        m.confirm = { input: e.input };
      }
      out.push(m);
      byId[e.id] = m;
    } else if (e.type === "user.tool_confirmation") {
      const c = e as unknown as { tool_use_id: string; result: "allow" | "deny" };
      const m = byId[c.tool_use_id];
      if (m?.confirm) m.confirm.resolved = c.result;
    } else if (e.type === "agent.tool_result") {
      // Tool ran, so any pending confirmation for it is implicitly allowed.
      const m = byId[(e as { tool_use_id?: string }).tool_use_id ?? ""];
      if (m?.confirm && !m.confirm.resolved) m.confirm.resolved = "allow";
    } else if (e.type === "span.outcome_evaluation_end" && e.result) {
      out.push({
        id: e.id,
        role: "assistant",
        text: "",
        agent: "grader",
        outcome: { result: e.result, explanation: e.explanation },
      });
    } else if (
      e.type.startsWith("session.") ||
      e.type.startsWith("span.") ||
      e.type === "agent.thinking"
    ) {
      out.push({ id: e.id, role: "assistant", text: "", marker: e.type, agent: aname });
    } else if (e.type === "error") {
      // Synthetic event from the SSE bridge or a failed POST. Persists in the
      // chat so workshop stubs (501s) are visible until they're implemented.
      out.push({ id: e.id, role: "assistant", text: "", error: e.error ?? "request failed" });
    }
  }
  return out;
}
