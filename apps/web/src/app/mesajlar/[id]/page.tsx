export const runtime = "edge";
import { Chat } from "@/components/Chat";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Chat conversationId={id} />;
}
