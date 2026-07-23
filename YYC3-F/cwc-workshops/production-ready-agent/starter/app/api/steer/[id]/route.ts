import { client, stub } from "@/lib/anthropic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { text, kind = "message" } = (await req.json()) as {
    text: string;
    kind?: "message" | "outcome";
  };

  // TODO 3 — send a user event into the session.
  //
  // The chat input toggles between two event types. A user.message is a normal
  // turn — the first one flips the session from idle to running. A
  // user.define_outcome declares "what done looks like"; a grader scores the
  // run against it and the UI renders the result as the graded thesis.
  //
  //   const event = kind === "outcome"
  //     ? { type: "user.define_outcome", description: text, rubric: { type: "text", content: text } }
  //     : { type: "user.message", content: [{ type: "text", text }] };
  //
  //   await client.beta.sessions.events.send(id, { events: [event] });
  //   return Response.json({ ok: true });

  return stub("TODO 3", "client.beta.sessions.events.send()");
}
