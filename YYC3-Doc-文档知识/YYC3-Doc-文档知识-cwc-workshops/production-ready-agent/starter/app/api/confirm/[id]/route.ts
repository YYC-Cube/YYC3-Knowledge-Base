import { client, stub } from "@/lib/anthropic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tool_use_id, result, message } = (await req.json()) as {
    tool_use_id: string;
    result: "allow" | "deny";
    message?: string;
  };

  // TODO 6 — resolve a gated tool call.
  //
  // Tools with permission_policy: { type: "always_ask" } pause the run and the
  // chat shows Allow / Deny. Resolve it the same way you sent a message in
  // TODO 3 — events.send() with one user.tool_confirmation event. On deny,
  // pass deny_message so the agent can adapt.
  //
  //   await client.beta.sessions.events.send(id, {
  //     events: [{ type: "user.tool_confirmation", tool_use_id, result, deny_message: message }],
  //   });
  //   return Response.json({ ok: true });

  return stub("TODO 6", "client.beta.sessions.events.send()");
}
