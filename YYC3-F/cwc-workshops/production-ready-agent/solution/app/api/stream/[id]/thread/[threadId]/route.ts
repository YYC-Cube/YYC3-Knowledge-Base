import { client } from "@/lib/anthropic";
import { sse, READY } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; threadId: string }> },
) {
  const { id, threadId } = await params;
  return sse(async (write) => {
    const stream = await client.beta.sessions.threads.events.stream(threadId, { session_id: id });
    for await (const e of client.beta.sessions.threads.events.list(threadId, { session_id: id }))
      write(e);
    write(READY);
    for await (const e of stream) {
      write(e);
      if (e.type === "session.thread_status_terminated") break;
    }
  });
}
