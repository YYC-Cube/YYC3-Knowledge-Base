import { client, ids } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function GET() {
  const page = await client.beta.sessions.list({ limit: 30 });
  return Response.json(page.data);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { mcp?: boolean; memory?: boolean };
  const mcp = body.mcp ?? true;
  const memory = body.memory ?? true;

  const session = await client.beta.sessions.create({
    // Always the latest agent version. bin/enable-multiagent.sh adds the
    // sub-agent roster as a new version; once it has run, new sessions get it.
    agent: ids.agent,
    environment_id: ids.environment,
    title: "Deal Desk",
    resources: [
      ...(memory
        ? [{ type: "memory_store" as const, memory_store_id: ids.memoryStore, access: "read_only" as const }]
        : []),
      ...ids.files.map((file_id, i) => ({
        type: "file" as const,
        file_id,
        // Platform prefixes this with /mnt/session/uploads/
        mount_path: `targets/${i}.csv`,
      })),
    ],
    ...(mcp && ids.vault ? { vault_ids: [ids.vault] } : {}),
    metadata: { mcp: String(mcp), memory: String(memory) },
  });
  // No events sent yet: session stays idle until the first user.message.
  return Response.json(session);
}
