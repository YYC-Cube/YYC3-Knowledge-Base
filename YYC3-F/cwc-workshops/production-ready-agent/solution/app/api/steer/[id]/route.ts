import { client } from "@/lib/anthropic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { text, kind = "message" } = (await req.json()) as {
    text: string;
    kind?: "message" | "outcome";
  };

  const event =
    kind === "outcome"
      ? {
          type: "user.define_outcome" as const,
          description: text,
          rubric: { type: "text" as const, content: text },
        }
      : { type: "user.message" as const, content: [{ type: "text" as const, text }] };

  await client.beta.sessions.events.send(id, { events: [event] });
  return Response.json({ ok: true });
}
