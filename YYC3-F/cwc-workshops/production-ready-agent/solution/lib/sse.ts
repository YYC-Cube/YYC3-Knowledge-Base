// Server-Sent Events bridge. The browser opens an EventSource to a route that
// returns `sse(fill)`; `fill` receives a `write(event)` that emits one `data:`
// line per event and dedupes by id. Errors thrown inside `fill` (including the
// workshop "not implemented yet" stubs) are surfaced as a single
// `{ type: "error" }` event so the chat can render them inline.

// Minimal contract: anything with an `id`. The Managed Agents event union and
// the synthetic READY/error events all satisfy it.
export type Write = <T extends { id: string }>(e: T) => void;

// Synthetic event written between the history backfill and the live tail so
// the UI knows the spinner can stop.
export const READY = { id: "_ready", type: "_ready" };

export function sse(fill: (write: Write) => Promise<void>): Response {
  const enc = new TextEncoder();
  const seen = new Set<string>();
  const body = new ReadableStream({
    async start(ctrl) {
      const write: Write = (e) => {
        if (seen.has(e.id)) return;
        seen.add(e.id);
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        await fill(write);
      } catch (err) {
        const error = err instanceof Error ? err.message : "stream error";
        // Long-lived idle SSE connections hit fetch's body timeout and the SDK
        // throws "terminated"; that's benign — the browser's EventSource will
        // reconnect and the dedupe makes the replay a no-op. Only surface real
        // errors (e.g. a workshop stub) to the chat.
        if (/terminated|timeout/i.test(error)) {
          ctrl.close();
          return;
        }
        console.error("[sse]", err);
        // Stable id: EventSource auto-reconnects every ~3s, and the stub throws
        // again each time. The chat dedupes by id, so this renders once.
        write({ id: "_stream_error", type: "error", error });
      }
      ctrl.close();
    },
  });
  return new Response(body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
}
