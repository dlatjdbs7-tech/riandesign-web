import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ChatConversationView from "@/components/admin/chat/ChatConversationView";

async function resolveLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string
) {
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("id, type, name")
    .eq("id", roomId)
    .single();

  if (!conv) return null;

  if (conv.type === "group") {
    return { label: conv.name ?? "채팅방", isGroup: true };
  }

  const { data: members } = await supabase
    .from("chat_conversation_members")
    .select("user_id")
    .eq("conversation_id", roomId)
    .neq("user_id", userId);
  const otherId = members?.[0]?.user_id;

  if (otherId) {
    const { data: dir } = await supabase.rpc("chat_directory");
    const other = (dir ?? []).find((d: { id: string; full_name: string }) => d.id === otherId);
    if (other) return { label: other.full_name, isGroup: false };
  }

  return { label: "1:1 대화", isGroup: false };
}

export default async function ChatPopupPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (!profile || profile.status !== "approved") redirect("/pending");

  const resolved = await resolveLabel(supabase, roomId, user.id);

  if (!resolved) {
    return (
      <main className="flex h-screen items-center justify-center bg-white font-admin text-sm text-charcoal/50">
        접근할 수 없는 채팅방입니다.
      </main>
    );
  }

  return (
    <ChatConversationView
      conversationId={roomId}
      currentUserId={user.id}
      label={resolved.label}
      isGroup={resolved.isGroup}
      variant="standalone"
    />
  );
}
