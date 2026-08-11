"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const GROUP_CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";

type ConversationSummary = {
  conversation_id: string;
  type: "group" | "dm";
  other_user_id: string | null;
  other_user_name: string | null;
  last_read_at: string;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
};

type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type DirectoryEntry = { id: string; full_name: string };

function isUnread(conv: ConversationSummary, myId: string) {
  if (!conv.last_message_at) return false;
  if (conv.last_sender_id === myId) return false;
  return new Date(conv.last_message_at).getTime() > new Date(conv.last_read_at).getTime();
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget({ currentUserId }: { currentUserId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const nameOf = (userId: string) => {
    if (userId === currentUserId) return "나";
    return directory.find((d) => d.id === userId)?.full_name ?? "알 수 없음";
  };

  async function refreshConversations() {
    const { data } = await supabase.rpc("list_my_conversations");
    if (data) setConversations(data as ConversationSummary[]);
  }

  useEffect(() => {
    (async () => {
      await supabase
        .from("chat_conversation_members")
        .upsert(
          { conversation_id: GROUP_CONVERSATION_ID, user_id: currentUserId },
          { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
        );

      const { data: dir } = await supabase.rpc("chat_directory");
      if (dir) setDirectory(dir as DirectoryEntry[]);

      await refreshConversations();
    })();

    const channel = supabase
      .channel("chat-messages-widget")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessageRow;

          if (activeConversationIdRef.current === row.conversation_id) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
            if (isOpenRef.current) {
              supabase
                .from("chat_conversation_members")
                .update({ last_read_at: new Date().toISOString() })
                .eq("conversation_id", row.conversation_id)
                .eq("user_id", currentUserId)
                .then(() => refreshConversations());
              return;
            }
          }

          refreshConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const unreadTotal = conversations.filter((c) => isUnread(c, currentUserId)).length;

  async function markRead(conversationId: string) {
    await supabase
      .from("chat_conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
    refreshConversations();
  }

  async function openConversation(conversationId: string, label: string) {
    setActiveConversationId(conversationId);
    setActiveLabel(label);
    setMessages([]);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<ChatMessageRow[]>();
    if (data) setMessages(data);
    markRead(conversationId);
  }

  async function openGroupChat() {
    openConversation(GROUP_CONVERSATION_ID, "리안채팅방");
  }

  async function openDm(otherUserId: string, otherUserName: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm_conversation", {
      other_user_id: otherUserId,
    });
    if (error || !data) return;
    await openConversation(data as string, otherUserName);
    refreshConversations();
  }

  function closeConversation() {
    setActiveConversationId(null);
    setMessages([]);
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !activeConversationId || isSending) return;
    setIsSending(true);
    setDraft("");

    const optimistic: ChatMessageRow = {
      id: `optimistic-${Date.now()}`,
      conversation_id: activeConversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase
      .from("chat_messages")
      .insert({ conversation_id: activeConversationId, sender_id: currentUserId, content });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
    } else {
      refreshConversations();
    }
    setIsSending(false);
  }

  const dmPartnerIds = new Set(
    conversations.filter((c) => c.type === "dm" && c.other_user_id).map((c) => c.other_user_id)
  );
  const newDmTargets = directory.filter((d) => !dmPartnerIds.has(d.id));
  const isGroupActive = activeConversationId === GROUP_CONVERSATION_ID;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-[30rem] w-80 flex-col overflow-hidden rounded-2xl border border-nude/60 bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-nude/60 bg-red-500 px-4 py-3 text-white">
            {activeConversationId ? (
              <button onClick={closeConversation} className="rounded-full p-1 hover:bg-red-600">
                <ArrowLeft size={16} />
              </button>
            ) : (
              <MessageCircle size={16} />
            )}
            <p className="flex-1 truncate text-sm font-medium">
              {activeConversationId ? activeLabel : "리안채팅방"}
            </p>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-red-600">
              <X size={16} />
            </button>
          </div>

          {activeConversationId ? (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {messages.map((m) => {
                  const mine = m.sender_id === currentUserId;
                  return (
                    <div key={m.id} className={`mb-2 flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {!mine && isGroupActive && (
                        <span className="mb-0.5 px-1 text-[11px] text-charcoal/50">{nameOf(m.sender_id)}</span>
                      )}
                      <div className="flex items-end gap-1.5">
                        {mine && <span className="text-[10px] text-charcoal/40">{formatTime(m.created_at)}</span>}
                        <div
                          className={`max-w-[13rem] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                            mine ? "bg-red-100 text-charcoal" : "bg-stone-100 text-charcoal"
                          }`}
                        >
                          {m.content}
                        </div>
                        {!mine && <span className="text-[10px] text-charcoal/40">{formatTime(m.created_at)}</span>}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex items-end gap-2 border-t border-nude/60 p-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="메시지 입력..."
                  className="max-h-24 flex-1 resize-none rounded-full border border-nude bg-stone-50 px-3 py-2 text-sm outline-none focus:border-red-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || isSending}
                  className="rounded-full bg-red-500 p-2 text-white hover:bg-red-600 disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <button
                onClick={openGroupChat}
                className="flex w-full items-center gap-2 border-b border-nude/30 px-4 py-3 text-left hover:bg-stone-50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <MessageCircle size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-charcoal">리안채팅방</span>
                    {conversations.some((c) => c.conversation_id === GROUP_CONVERSATION_ID && isUnread(c, currentUserId)) && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-charcoal/50">
                    {conversations.find((c) => c.conversation_id === GROUP_CONVERSATION_ID)?.last_message ??
                      "전체 팀원 단체 채팅방"}
                  </span>
                </span>
              </button>

              {conversations
                .filter((c) => c.type === "dm")
                .map((c) => (
                  <button
                    key={c.conversation_id}
                    onClick={() => openConversation(c.conversation_id, c.other_user_name ?? "알 수 없음")}
                    className="flex w-full items-center gap-2 border-b border-nude/30 px-4 py-3 text-left hover:bg-stone-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-charcoal/70 text-xs font-medium">
                      {c.other_user_name?.slice(0, 1) ?? "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-charcoal">{c.other_user_name}</span>
                        {isUnread(c, currentUserId) && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                      </span>
                      <span className="block truncate text-xs text-charcoal/50">{c.last_message ?? "대화 시작"}</span>
                    </span>
                  </button>
                ))}

              {newDmTargets.length > 0 && (
                <>
                  <p className="px-4 pt-3 pb-1 text-[11px] tracking-wide text-charcoal/40">팀원</p>
                  {newDmTargets.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => openDm(d.id, d.full_name)}
                      className="flex w-full items-center gap-2 border-b border-nude/30 px-4 py-2.5 text-left hover:bg-stone-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-charcoal/60 text-xs font-medium">
                        {d.full_name.slice(0, 1)}
                      </span>
                      <span className="text-sm text-charcoal/80">{d.full_name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        {!isOpen && unreadTotal > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-red-600 shadow">
            {unreadTotal}
          </span>
        )}
      </button>
    </div>
  );
}
