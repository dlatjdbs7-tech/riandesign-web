"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  ArrowLeft,
  Send,
  Plus,
  Trash2,
  Paperclip,
  Images,
  FileText,
  Download,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const PINNED_ROOM_ID = "00000000-0000-0000-0000-000000000001";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

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

type GroupRoom = {
  conversation_id: string;
  name: string;
  created_by: string | null;
  is_member: boolean;
  sort_order: number;
  last_message: string | null;
  last_message_at: string | null;
};

type ChatMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
};

type DirectoryEntry = { id: string; full_name: string };

type CtxMenu =
  | { type: "empty"; x: number; y: number }
  | { type: "room"; x: number; y: number; roomId: string; roomName: string }
  | { type: "message"; x: number; y: number; messageId: string }
  | null;

function isUnread(conv: ConversationSummary, myId: string) {
  if (!conv.last_message_at) return false;
  if (conv.last_sender_id === myId) return false;
  return new Date(conv.last_message_at).getTime() > new Date(conv.last_read_at).getTime();
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWidget({
  currentUserId,
  isOwner,
}: {
  currentUserId: string;
  isOwner: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [groupRooms, setGroupRooms] = useState<GroupRoom[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string>("");
  const [activeIsGroup, setActiveIsGroup] = useState(false);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerItems, setDrawerItems] = useState<ChatMessageRow[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const activeConversationIdRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [ctxMenu]);

  const nameOf = (userId: string) => {
    if (userId === currentUserId) return "나";
    return directory.find((d) => d.id === userId)?.full_name ?? "알 수 없음";
  };

  async function refreshConversations() {
    const { data } = await supabase.rpc("list_my_conversations");
    if (data) setConversations(data as ConversationSummary[]);
  }

  async function refreshGroupRooms() {
    const { data } = await supabase.rpc("list_group_rooms");
    if (data) setGroupRooms(data as GroupRoom[]);
  }

  useEffect(() => {
    (async () => {
      const { data: dir } = await supabase.rpc("chat_directory");
      if (dir) setDirectory(dir as DirectoryEntry[]);

      await Promise.all([refreshConversations(), refreshGroupRooms()]);
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
          refreshGroupRooms();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.old as { id: string; conversation_id: string };
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
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

  async function openConversation(conversationId: string, label: string, isGroup: boolean) {
    setActiveConversationId(conversationId);
    setActiveLabel(label);
    setActiveIsGroup(isGroup);
    setMessages([]);
    setShowDrawer(false);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<ChatMessageRow[]>();
    if (data) setMessages(data);
    markRead(conversationId);
  }

  async function openRoom(roomId: string, roomName: string) {
    await supabase
      .from("chat_conversation_members")
      .upsert(
        { conversation_id: roomId, user_id: currentUserId },
        { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
      );
    await openConversation(roomId, roomName, true);
    refreshGroupRooms();
  }

  async function openDm(otherUserId: string, otherUserName: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm_conversation", {
      other_user_id: otherUserId,
    });
    if (error || !data) return;
    await openConversation(data as string, otherUserName, false);
    refreshConversations();
  }

  function closeConversation() {
    setActiveConversationId(null);
    setMessages([]);
    setShowDrawer(false);
  }

  async function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    const { data, error } = await supabase.rpc("create_chat_room", { room_name: name });
    if (error || !data) return;
    setNewRoomName("");
    setIsCreatingRoom(false);
    await refreshGroupRooms();
    await openConversation(data as string, name, true);
  }

  async function deleteRoom(roomId: string, roomName: string) {
    if (!window.confirm(`"${roomName}" 방을 삭제할까요? 대화 내용이 모두 삭제됩니다.`)) return;
    await supabase.from("chat_conversations").delete().eq("id", roomId);
    if (activeConversationId === roomId) closeConversation();
    refreshGroupRooms();
    refreshConversations();
  }

  async function renameRoom(roomId: string, currentName: string) {
    const newName = window.prompt("새 방 이름", currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    const { error } = await supabase.rpc("rename_chat_room", { room_id: roomId, new_name: newName.trim() });
    if (!error) {
      if (activeConversationId === roomId) setActiveLabel(newName.trim());
      refreshGroupRooms();
    }
  }

  async function deleteMessage(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await supabase.from("chat_messages").delete().eq("id", messageId);
  }

  async function reorderOtherRooms(newOrderIds: string[]) {
    setGroupRooms((prev) => {
      const orderIndex = new Map(newOrderIds.map((id, i) => [id, i]));
      return prev.map((r) =>
        orderIndex.has(r.conversation_id) ? { ...r, sort_order: orderIndex.get(r.conversation_id)! } : r
      );
    });
    await Promise.all(
      newOrderIds.map((id, index) =>
        supabase
          .from("chat_conversation_members")
          .update({ sort_order: index })
          .eq("conversation_id", id)
          .eq("user_id", currentUserId)
      )
    );
    refreshGroupRooms();
  }

  function handleDropOnRoom(targetId: string) {
    if (!draggedRoomId || draggedRoomId === targetId) {
      setDraggedRoomId(null);
      return;
    }
    const currentOrder = otherRooms.map((r) => r.conversation_id);
    const fromIndex = currentOrder.indexOf(draggedRoomId);
    const toIndex = currentOrder.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedRoomId(null);
      return;
    }
    const next = [...currentOrder];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedRoomId);
    setDraggedRoomId(null);
    reorderOtherRooms(next);
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !activeConversationId || isSending) return;
    setIsSending(true);
    setDraft("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: optimisticId,
      conversation_id: activeConversationId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      attachment_url: null,
      attachment_name: null,
      attachment_type: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({ conversation_id: activeConversationId, sender_id: currentUserId, content })
      .select()
      .single();

    if (error || !inserted) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(content);
    } else {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? (inserted as ChatMessageRow) : m)));
      refreshConversations();
      refreshGroupRooms();
    }
    setIsSending(false);
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!activeConversationId) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setIsUploading(true);

    for (const file of list) {
      if (file.size > MAX_FILE_SIZE) {
        window.alert(`"${file.name}" 파일이 너무 큽니다 (25MB 이하만 가능).`);
        continue;
      }

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${activeConversationId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file);
      if (uploadError) continue;

      const { data: publicUrlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      const attachmentType = file.type.startsWith("image/") ? "image" : "file";

      const { data: inserted } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: activeConversationId,
          sender_id: currentUserId,
          content: null,
          attachment_url: publicUrlData.publicUrl,
          attachment_name: file.name,
          attachment_type: attachmentType,
        })
        .select()
        .single();

      if (inserted) {
        setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted as ChatMessageRow]));
      }
    }

    refreshConversations();
    refreshGroupRooms();
    setIsUploading(false);
  }

  async function openDrawer() {
    setShowDrawer(true);
    if (!activeConversationId) return;
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", activeConversationId)
      .not("attachment_url", "is", null)
      .order("created_at", { ascending: false })
      .returns<ChatMessageRow[]>();
    if (data) setDrawerItems(data);
  }

  const dmPartnerIds = new Set(
    conversations.filter((c) => c.type === "dm" && c.other_user_id).map((c) => c.other_user_id)
  );
  const newDmTargets = directory.filter((d) => !dmPartnerIds.has(d.id));

  const groupUnread = (roomId: string) =>
    conversations.some((c) => c.conversation_id === roomId && isUnread(c, currentUserId));

  const pinnedRoom = groupRooms.find((r) => r.conversation_id === PINNED_ROOM_ID);
  const otherRooms = groupRooms
    .filter((r) => r.conversation_id !== PINNED_ROOM_ID)
    .sort((a, b) => a.sort_order - b.sort_order);

  function renderRoomRow(room: GroupRoom, draggable: boolean) {
    return (
      <div
        key={room.conversation_id}
        draggable={draggable}
        onDragStart={() => setDraggedRoomId(room.conversation_id)}
        onDragOver={(e) => draggable && e.preventDefault()}
        onDrop={() => draggable && handleDropOnRoom(room.conversation_id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setCtxMenu({ type: "room", x: e.clientX, y: e.clientY, roomId: room.conversation_id, roomName: room.name });
        }}
        className={`group flex w-full items-center gap-2 border-b border-nude/30 px-4 py-3 text-left hover:bg-stone-50 ${
          draggedRoomId === room.conversation_id ? "opacity-40" : ""
        }`}
      >
        <button
          onClick={() => openRoom(room.conversation_id, room.name)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <MessageCircle size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-charcoal">{room.name}</span>
              {groupUnread(room.conversation_id) && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />}
            </span>
            <span className="block truncate text-xs text-charcoal/50">{room.last_message ?? "대화 시작"}</span>
          </span>
        </button>
        {isOwner && room.conversation_id !== PINNED_ROOM_ID && (
          <button
            onClick={() => deleteRoom(room.conversation_id, room.name)}
            className="shrink-0 text-charcoal/30 opacity-0 hover:text-red-600 group-hover:opacity-100"
            title="방 삭제 (대표 권한)"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  }

  function renderMessageBubble(m: ChatMessageRow) {
    const mine = m.sender_id === currentUserId;
    return (
      <div key={m.id} className={`mb-2 flex flex-col ${mine ? "items-end" : "items-start"}`}>
        {!mine && activeIsGroup && (
          <span className="mb-0.5 px-1 text-[11px] text-charcoal/50">{nameOf(m.sender_id)}</span>
        )}
        <div className="flex items-end gap-1.5">
          {mine && <span className="text-[10px] text-charcoal/40">{formatTime(m.created_at)}</span>}
          <div
            onContextMenu={(e) => {
              if (!mine) return;
              e.preventDefault();
              e.stopPropagation();
              setCtxMenu({ type: "message", x: e.clientX, y: e.clientY, messageId: m.id });
            }}
            className={`max-w-[13rem] ${mine ? "cursor-context-menu" : ""}`}
          >
            {m.attachment_url && m.attachment_type === "image" ? (
              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={m.attachment_url}
                  alt={m.attachment_name ?? "이미지"}
                  className="max-h-48 rounded-xl object-cover"
                />
              </a>
            ) : m.attachment_url ? (
              <a
                href={m.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                download={m.attachment_name ?? undefined}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  mine ? "bg-red-100 text-charcoal" : "bg-stone-100 text-charcoal"
                }`}
              >
                <FileText size={16} className="shrink-0" />
                <span className="truncate">{m.attachment_name ?? "파일"}</span>
                <Download size={12} className="shrink-0 text-charcoal/40" />
              </a>
            ) : null}
            {m.content && (
              <div
                className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  m.attachment_url ? "mt-1" : ""
                } ${mine ? "bg-red-100 text-charcoal" : "bg-stone-100 text-charcoal"}`}
              >
                {m.content}
              </div>
            )}
          </div>
          {!mine && <span className="text-[10px] text-charcoal/40">{formatTime(m.created_at)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex h-[30rem] w-80 flex-col overflow-hidden rounded-2xl border border-nude/60 bg-white shadow-2xl">
          <div className="flex items-center gap-2 border-b border-nude/60 bg-red-500 px-4 py-3 text-white">
            {activeConversationId ? (
              <button
                onClick={showDrawer ? () => setShowDrawer(false) : closeConversation}
                className="rounded-full p-1 hover:bg-red-600"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <MessageCircle size={16} />
            )}
            <p className="flex-1 truncate text-sm font-medium">
              {activeConversationId ? (showDrawer ? `${activeLabel} · 서랍` : activeLabel) : "REAN GROUP"}
            </p>
            {activeConversationId && !showDrawer && (
              <button onClick={openDrawer} className="rounded-full p-1 hover:bg-red-600" title="사진·파일 모아보기">
                <Images size={16} />
              </button>
            )}
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-red-600">
              <X size={16} />
            </button>
          </div>

          {activeConversationId && showDrawer ? (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="mb-2 text-[11px] tracking-wide text-charcoal/40">
                사진·동영상 {drawerItems.filter((d) => d.attachment_type === "image").length}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {drawerItems
                  .filter((d) => d.attachment_type === "image")
                  .map((d) => (
                    <a key={d.id} href={d.attachment_url!} target="_blank" rel="noopener noreferrer">
                      <img src={d.attachment_url!} alt="" className="aspect-square w-full rounded-md object-cover" />
                    </a>
                  ))}
                {drawerItems.filter((d) => d.attachment_type === "image").length === 0 && (
                  <p className="col-span-3 py-4 text-center text-xs text-charcoal/40">사진이 없습니다</p>
                )}
              </div>

              <p className="mt-4 mb-2 text-[11px] tracking-wide text-charcoal/40">
                파일 {drawerItems.filter((d) => d.attachment_type === "file").length}
              </p>
              <div className="flex flex-col gap-1">
                {drawerItems
                  .filter((d) => d.attachment_type === "file")
                  .map((d) => (
                    <a
                      key={d.id}
                      href={d.attachment_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={d.attachment_name ?? undefined}
                      className="flex items-center gap-2 rounded-lg border border-nude/40 px-2.5 py-2 text-xs text-charcoal hover:bg-stone-50"
                    >
                      <FileText size={14} className="shrink-0 text-charcoal/50" />
                      <span className="truncate">{d.attachment_name}</span>
                    </a>
                  ))}
                {drawerItems.filter((d) => d.attachment_type === "file").length === 0 && (
                  <p className="py-4 text-center text-xs text-charcoal/40">파일이 없습니다</p>
                )}
              </div>
            </div>
          ) : activeConversationId ? (
            <>
              <div
                className="relative flex-1 overflow-y-auto px-3 py-3"
                onDragEnter={(e) => {
                  e.preventDefault();
                  dragCounterRef.current += 1;
                  setIsDraggingFile(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => {
                  dragCounterRef.current -= 1;
                  if (dragCounterRef.current <= 0) setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dragCounterRef.current = 0;
                  setIsDraggingFile(false);
                  if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
                }}
              >
                {isDraggingFile && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-red-400 bg-red-50/90 text-sm font-medium text-red-600">
                    여기에 파일을 놓으세요
                  </div>
                )}
                {messages.map(renderMessageBubble)}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex items-end gap-2 border-t border-nude/60 p-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) uploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="shrink-0 rounded-full p-2 text-charcoal/50 hover:bg-stone-100 hover:text-red-500 disabled:opacity-40"
                  title="파일 첨부"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
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
                  className="shrink-0 rounded-full bg-red-500 p-2 text-white hover:bg-red-600 disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div
              className="flex-1 overflow-y-auto"
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ type: "empty", x: e.clientX, y: e.clientY });
              }}
            >
              <div className="flex items-center justify-between border-b border-nude/30 px-4 pt-3 pb-1">
                <p className="text-[11px] tracking-wide text-charcoal/40">채팅방</p>
                <button
                  onClick={() => setIsCreatingRoom((v) => !v)}
                  className="flex items-center gap-0.5 text-[11px] text-taupe hover:text-red-600"
                >
                  <Plus size={12} /> 방 만들기
                </button>
              </div>

              {isCreatingRoom && (
                <div className="flex items-center gap-1.5 border-b border-nude/30 px-4 py-2">
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) createRoom();
                    }}
                    placeholder="방 이름"
                    autoFocus
                    className="flex-1 rounded-full border border-nude bg-stone-50 px-3 py-1.5 text-xs outline-none focus:border-red-400"
                  />
                  <button
                    onClick={createRoom}
                    disabled={!newRoomName.trim()}
                    className="rounded-full bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600 disabled:opacity-40"
                  >
                    만들기
                  </button>
                </div>
              )}

              {pinnedRoom && renderRoomRow(pinnedRoom, false)}
              {otherRooms.map((room) => renderRoomRow(room, room.is_member))}

              {conversations
                .filter((c) => c.type === "dm")
                .map((c) => (
                  <button
                    key={c.conversation_id}
                    onClick={() => openConversation(c.conversation_id, c.other_user_name ?? "알 수 없음", false)}
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

      {ctxMenu && (
        <div
          style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 60 }}
          className="min-w-[9rem] overflow-hidden rounded-lg border border-nude/60 bg-white py-1 text-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.type === "empty" && (
            <button
              onClick={() => {
                setIsCreatingRoom(true);
                setCtxMenu(null);
              }}
              className="block w-full px-3 py-2 text-left text-charcoal hover:bg-stone-50"
            >
              + 채팅방 생성
            </button>
          )}
          {ctxMenu.type === "room" && (
            <button
              onClick={() => {
                renameRoom(ctxMenu.roomId, ctxMenu.roomName);
                setCtxMenu(null);
              }}
              className="block w-full px-3 py-2 text-left text-charcoal hover:bg-stone-50"
            >
              이름변경
            </button>
          )}
          {ctxMenu.type === "message" && (
            <button
              onClick={() => {
                deleteMessage(ctxMenu.messageId);
                setCtxMenu(null);
              }}
              className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
            >
              삭제
            </button>
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
