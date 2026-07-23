import { client, stub } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // TODO 4 — retrieve a session for the right rail.
  //
  //   const session = await client.beta.sessions.retrieve(id);
  //   return Response.json(session);

  return stub("TODO 4", "client.beta.sessions.retrieve()");
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // TODO 7 — delete a session.
  //
  //   await client.beta.sessions.delete(id);
  //   return Response.json({ ok: true });

  return stub("TODO 7", "client.beta.sessions.delete()");
}
