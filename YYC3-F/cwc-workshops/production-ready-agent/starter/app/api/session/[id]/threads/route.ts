import { client } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

// List the sub-agent threads spawned by the coordinator. The chat panel polls
// this to render the per-thread tabs; an empty list means no delegation yet.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out: { id: string; name: string; model: string }[] = [];
  for await (const t of client.beta.sessions.threads.list(id)) {
    // The primary (coordinator) thread has no parent; the chat panel already
    // shows it as the default tab.
    if (!t.parent_thread_id) continue;
    out.push({ id: t.id, name: t.agent.name, model: t.agent.model.id });
  }
  return Response.json(out);
}
