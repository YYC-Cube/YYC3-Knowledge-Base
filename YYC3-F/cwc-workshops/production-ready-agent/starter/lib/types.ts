// Projection of BetaManagedAgentsOutcomeEvaluationResource.
export interface Evaluation {
  outcome_id: string;
  result: string; // pending | running | evaluating | satisfied | max_iterations_reached | failed | interrupted
  explanation?: string | null;
  iteration?: number;
}

export interface SessionSummary {
  id: string;
  title: string;
  status: "running" | "idle" | "rescheduling" | "terminated";
  created_at: string;
  outcome_evaluations?: Evaluation[];
}

// Thin projection of the SSE event stream for the transcript UI.
export interface StreamEvent {
  id: string;
  type: string;
  // thread routing
  thread_id?: string; // session.thread_created, session.thread_status_*
  agent_name?: string; // session.thread_created
  from_agent_name?: string; // agent.thread_message_received
  from_thread_id?: string; // agent.thread_message_received
  to_agent_name?: string; // agent.thread_message_sent
  to_thread_id?: string; // agent.thread_message_sent
  session_thread_id?: string; // agent.mcp_tool_use within a sub-agent
  mcp_server_name?: string;
  // payloads
  content?: { type: string; text?: string }[];
  name?: string; // agent.tool_use
  tool_name?: string;
  input?: unknown;
  // span.outcome_evaluation_end - fields are flat on the event
  result?: string;
  explanation?: string;
  iteration?: number;
  outcome_id?: string;
  error?: string;
}
