import { client } from "@/lib/anthropic";
import { sse, READY } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sse(async (write) => {
    // TODO 5 — bridge the session event stream to SSE.
    //
    // Sessions emit a replayable event log: every model turn, tool call,
    // sub-agent thread, status change, and outcome evaluation is an event.
    // The UI is a reducer over that log (lib/chat.ts). The browser opens an
    // EventSource here; sse() (lib/sse.ts) handles the SSE protocol and gives
    // you write(event), deduping by id.
    //
    // Open the live tail first, backfill from history, mark READY, then tail:
    //
    //   const stream = await client.beta.sessions.events.stream(id);
    //   for await (const e of client.beta.sessions.events.list(id)) write(e);
    //   write(READY);
    //   for await (const e of stream) {
    //     write(e);
    //     if (e.type === "session.status_terminated") break;
    //   }
    //
    // Then delete the throw below.

    throw new Error("TODO 5 — implement events.list() + events.stream() above");
  });
}
