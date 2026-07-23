import { client } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await client.beta.sessions.retrieve(id);
  return Response.json(s);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await client.beta.sessions.delete(id);
  return Response.json({ ok: true });
}
