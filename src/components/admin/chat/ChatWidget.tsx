"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, X, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ChatConversationView from "./ChatConversationView";

const PINNED_ROOM_ID = "00000000-0000-0000-0000-000000000001";

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

type DirectoryEntry = { id: string; full_name: string };

type CtxMenu =
  | { type: "empty"; x: number; y: number }
  | { type: "room"; x: number; y: number; roomId: string; roomName: string }
  | null;

function isUnread(conv: ConversationSummary, myId: string) {
  if (!conv.last_message_at) return false;
  if (conv.last_sender_id === myId) return false;
  return new Date(conv.last_message_at).getTime() > new Date(conv.last_read_at).getTime();
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
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null);
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);

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
      .channel("chat-messages-widget-badges")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        refreshConversations();
        refreshGroupRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadTotal = conversations.filter((c) => isUnread(c, currentUserId)).length;

  function openConversation(conversationId: string, label: string, isGroup: boolean) {
    setActiveConversationId(conversationId);
    setActiveLabel(label);
    setActiveIsGroup(isGroup);
  }

  async function openRoom(roomId: string, roomName: string) {
    await supabase
      .from("chat_conversation_members")
      .upsert(
        { conversation_id: roomId, user_id: currentUserId },
        { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
      );
    openConversation(roomId, roomName, true);
    refreshGroupRooms();
  }

  async function openDm(otherUserId: string, otherUserName: string) {
    const { data, error } = await supabase.rpc("get_or_create_dm_conversation", {
      other_user_id: otherUserId,
    });
    if (error || !data) return;
    openConversation(data as string, otherUserName, false);
    refreshConversations();
  }

  function closeConversation() {
    setActiveConversationId(null);
  }

  async function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    const { data, error } = await supabase.rpc("create_chat_room", { room_name: name });
    if (error || !data) return;
    setNewRoomName("");
    setIsCreatingRoom(false);
    await refreshGroupRooms();
    openConversation(data as string, name, true);
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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="h-[30rem] w-80 overflow-hidden rounded-2xl border border-nude/60 bg-white shadow-2xl">
          {activeConversationId ? (
            <ChatConversationView
              conversationId={activeConversationId}
              currentUserId={currentUserId}
              label={activeLabel}
              isGroup={activeIsGroup}
              variant="embedded"
              onBack={closeConversation}
              onClose={() => setIsOpen(false)}
              onActivity={() => {
                refreshConversations();
                refreshGroupRooms();
              }}
            />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-nude/60 bg-red-500 px-4 py-3 text-white">
                <MessageCircle size={16} />
                <p className="flex-1 truncate text-sm font-medium">REAN GROUP</p>
                <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-red-600">
                  <X size={16} />
                </button>
              </div>
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
