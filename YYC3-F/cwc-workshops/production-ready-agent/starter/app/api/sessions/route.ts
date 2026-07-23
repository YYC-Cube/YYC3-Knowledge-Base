import { client, ids, stub } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function GET() {
  // TODO 1 — list sessions for the left rail.
  //
  //   const page = await client.beta.sessions.list({ limit: 30 });
  //   return Response.json(page.data);

  return stub("TODO 1", "client.beta.sessions.list()");
}

export async function POST(req: Request) {
  const body = (await req.json()) as { mcp?: boolean; memory?: boolean };
  const mcp = body.mcp ?? true;
  const memory = body.memory ?? true;

  // TODO 2 — create a session.
  //
  // A session pins the agent + environment and holds the event log. The modal
  // toggles control the resource mounts. See the starter README for the shapes,
  // or https://platform.claude.com/docs/en/managed-agents/quickstart#start-a-session.
  //
  //   const session = await client.beta.sessions.create({
  //     agent: ids.agent,
  //     environment_id: ids.environment,
  //     title: "Deal Desk",
  //     resources: [...],                // memory store + ids.files mounts
  //     vault_ids: [...],                // when mcp && ids.vault
  //   });
  //   return Response.json(session);

  return stub("TODO 2", "client.beta.sessions.create()");
}
