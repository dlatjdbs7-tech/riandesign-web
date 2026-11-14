"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import type { TrashResult } from "@/lib/trash";
import { restoreFromTrash } from "@/app/admin/trash/actions";
import { TRASH_EVENT } from "./DeleteButton";

type Toast = { kind: "deleted"; trashId: string; label: string } | { kind: "message"; text: string; error?: boolean };

const SHOW_MS = 10000;

// 관리자 화면 아래에 뜨는 "삭제했어요 · 되돌리기" 알림 (관리자 레이아웃에 한 번만 둔다)
export default function UndoToaster() {
  const router = useRouter();
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(next: Toast, ms = SHOW_MS) {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), ms);
  }

  useEffect(() => {
    function onTrashed(event: Event) {
      const result = (event as CustomEvent<TrashResult>).detail;
      if ("error" in result) show({ kind: "message", text: result.error, error: true }, 5000);
      else show({ kind: "deleted", trashId: result.trashId, label: result.label });
    }
    window.addEventListener(TRASH_EVENT, onTrashed);
    return () => window.removeEventListener(TRASH_EVENT, onTrashed);
  }, []);

  async function undo(trashId: string) {
    setBusy(true);
    const result = await restoreFromTrash(trashId);
    setBusy(false);
    if ("error" in result) show({ kind: "message", text: result.error, error: true }, 5000);
    else show({ kind: "message", text: "되돌렸어요." }, 2500);
    router.refresh();
  }

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div
        role="status"
        className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${
          toast.kind === "message" && toast.error ? "bg-red-700 text-white" : "bg-charcoal text-cream"
        }`}
      >
        {toast.kind === "deleted" ? (
          <>
            <span className="min-w-0 flex-1 truncate">
              {toast.label ? `"${toast.label}" 삭제했어요` : "삭제했어요"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => undo(toast.trashId)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              <RotateCcw size={14} /> {busy ? "되돌리는 중" : "되돌리기"}
            </button>
            <Link href="/admin/trash" className="shrink-0 text-xs text-cream/60 hover:text-cream">
              휴지통
            </Link>
          </>
        ) : (
          <span className="flex-1">{toast.text}</span>
        )}
        <button type="button" onClick={() => setToast(null)} aria-label="닫기" className="shrink-0 text-cream/50 hover:text-cream">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
