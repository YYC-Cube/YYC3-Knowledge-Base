import { DealDesk } from "@/components/DealDesk";

// Layout persists across /session/[id] and /session/[id]/thread/[threadId],
// so DealDesk (and its open EventSource) survives thread-tab navigation.
export default async function SessionLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  return (
    <>
      <DealDesk sessionId={id} />
      {children}
    </>
  );
}
