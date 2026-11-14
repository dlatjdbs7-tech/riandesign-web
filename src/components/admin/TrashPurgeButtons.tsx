"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { emptyTrash, purgeTrashItem } from "@/app/admin/trash/actions";

// 휴지통 비우기 (전체 완전 삭제)
export function EmptyTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`휴지통 ${count}개를 완전히 지웁니다.\n지운 뒤에는 되돌릴 수 없습니다. 비울까요?`)) return;
          startTransition(async () => {
            const result = await emptyTrash();
            if ("error" in result) setError(result.error ?? "비우지 못했습니다.");
            router.refresh();
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 size={15} /> {isPending ? "비우는 중" : "휴지통 비우기"}
      </button>
    </span>
  );
}

// 한 개만 완전 삭제
export function PurgeButton({ trashId, label }: { trashId: string; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`"${label}"을(를) 완전히 지웁니다. 되돌릴 수 없습니다.`)) return;
        startTransition(async () => {
          await purgeTrashItem(trashId);
          router.refresh();
        });
      }}
      className="text-xs text-charcoal/45 underline hover:text-red-600 disabled:opacity-50"
    >
      {isPending ? "지우는 중" : "완전 삭제"}
    </button>
  );
}
