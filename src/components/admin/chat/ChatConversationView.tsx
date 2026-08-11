"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, X, Send, Paperclip, Images, FileText, Download, ExternalLink } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { startTitleBlink } from "@/lib/titleBlink";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

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

type MsgCtxMenu = { x: number; y: number; messageId: string } | null;

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatConversationView({
  conversationId,
  currentUserId,
  label,
  isGroup,
  variant = "embedded",
  onBack,
  onClose,
  onActivity,
}: {
  conversationId: string;
  currentUserId: string;
  label: string;
  isGroup: boolean;
  variant?: "embedded" | "standalone";
  onBack?: () => void;
  onClose?: () => void;
  onActivity?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerItems, setDrawerItems] = useState<ChatMessageRow[]>([]);
  const [ctxMenu, setCtxMenu] = useState<MsgCtxMenu>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const nameOf = (userId: string) => {
    if (userId === currentUserId) return "나";
    return directory.find((d) => d.id === userId)?.full_name ?? "알 수 없음";
  };

  async function markRead() {
    await supabase
      .from("chat_conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);
    onActivity?.();
  }

  useEffect(() => {
    (async () => {
      const { data: dir } = await supabase.rpc("chat_directory");
      if (dir) setDirectory(dir as DirectoryEntry[]);

      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .returns<ChatMessageRow[]>();
      if (data) setMessages(data);
      markRead();
    })();

    const channel = supabase
      .channel(`chat-conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          markRead();
          if (row.sender_id !== currentUserId) startTitleBlink();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || isSending) return;
    setIsSending(true);
    setDraft("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: optimisticId,
      conversation_id: conversationId,
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
      .insert({ conversation_id: conversationId, sender_id: currentUserId, content })
      .select()
      .single();

    if (error || !inserted) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(content);
    } else {
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? (inserted as ChatMessageRow) : m)));
      onActivity?.();
    }
    setIsSending(false);
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setIsUploading(true);

    for (const file of list) {
      if (file.size > MAX_FILE_SIZE) {
        window.alert(`"${file.name}" 파일이 너무 큽니다 (25MB 이하만 가능).`);
        continue;
      }

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${conversationId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file);
      if (uploadError) continue;

      const { data: publicUrlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      const attachmentType = file.type.startsWith("image/") ? "image" : "file";

      const { data: inserted } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
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

    onActivity?.();
    setIsUploading(false);
  }

  async function deleteMessage(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await supabase.from("chat_messages").delete().eq("id", messageId);
  }

  async function openDrawer() {
    setShowDrawer(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .not("attachment_url", "is", null)
      .order("created_at", { ascending: false })
      .returns<ChatMessageRow[]>();
    if (data) setDrawerItems(data);
  }

  function openPopup() {
    const width = 380;
    const height = 620;
    // 메인 창과 겹치지 않도록 화면 우측 하단 쪽에 배치
    const left = Math.max(0, window.screen.availWidth - width - 24);
    const top = Math.max(0, window.screen.availHeight - height - 24);
    window.open(
      `/chat-popup/${conversationId}`,
      `chat-${conversationId}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,noopener`
    );
  }

  function renderMessageBubble(m: ChatMessageRow) {
    const mine = m.sender_id === currentUserId;
    return (
      <div key={m.id} className={`mb-2 flex flex-col ${mine ? "items-end" : "items-start"}`}>
        {!mine && isGroup && <span className="mb-0.5 px-1 text-[11px] text-charcoal/50">{nameOf(m.sender_id)}</span>}
        <div className="flex items-end gap-1.5">
          {mine && <span className="text-[10px] text-charcoal/40">{formatTime(m.created_at)}</span>}
          <div
            onContextMenu={(e) => {
              if (!mine) return;
              e.preventDefault();
              e.stopPropagation();
              setCtxMenu({ x: e.clientX, y: e.clientY, messageId: m.id });
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
    <div className={`flex flex-col overflow-hidden ${variant === "standalone" ? "h-screen bg-white" : "h-full"}`}>
      <div className="flex items-center gap-2 border-b border-nude/60 bg-red-500 px-4 py-3 text-white">
        {onBack && (
          <button onClick={showDrawer ? () => setShowDrawer(false) : onBack} className="rounded-full p-1 hover:bg-red-600">
            <ArrowLeft size={16} />
          </button>
        )}
        <p className="flex-1 truncate text-sm font-medium">{showDrawer ? `${label} · 서랍` : label}</p>
        {!showDrawer && (
          <button onClick={openDrawer} className="rounded-full p-1 hover:bg-red-600" title="사진·파일 모아보기">
            <Images size={16} />
          </button>
        )}
        {variant === "embedded" && !showDrawer && (
          <button onClick={openPopup} className="rounded-full p-1 hover:bg-red-600" title="팝업으로 열기">
            <ExternalLink size={16} />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="rounded-full p-1 hover:bg-red-600">
            <X size={16} />
          </button>
        )}
      </div>

      {showDrawer ? (
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
      ) : (
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
      )}

      {ctxMenu && (
        <div
          style={{ position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 60 }}
          className="min-w-[8rem] overflow-hidden rounded-lg border border-nude/60 bg-white py-1 text-sm shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              deleteMessage(ctxMenu.messageId);
              setCtxMenu(null);
            }}
            className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
