import { client } from "@/lib/anthropic";
import { sse, READY } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sse(async (write) => {
    // Open the live tail first so nothing falls in the gap, then backfill from
    // the history. `write` dedupes by event id so overlap is harmless.
    const stream = await client.beta.sessions.events.stream(id);
    for await (const e of client.beta.sessions.events.list(id)) write(e);
    write(READY);
    for await (const e of stream) {
      write(e);
      if (e.type === "session.status_terminated") break;
    }
  });
}
