import { client } from "@/lib/anthropic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tool_use_id, result, message } = (await req.json()) as {
    tool_use_id: string;
    result: "allow" | "deny";
    message?: string;
  };
  await client.beta.sessions.events.send(id, {
    events: [
      {
        type: "user.tool_confirmation",
        tool_use_id,
        result,
        ...(result === "deny" && message ? { deny_message: message } : {}),
      },
    ],
  });
  return Response.json({ ok: true });
}
