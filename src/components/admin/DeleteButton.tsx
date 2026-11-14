"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { TrashResult } from "@/lib/trash";

export const TRASH_EVENT = "rean:trashed";

// 지운 뒤 화면 아래에 "되돌리기" 알림을 띄우도록 UndoToaster에 알린다.
export function announceTrashed(result: TrashResult | void) {
  if (!result) return;
  window.dispatchEvent(new CustomEvent(TRASH_EVENT, { detail: result }));
}

// 기존 "삭제" 버튼 자리에 그대로 쓰는 버튼. 지운 항목은 휴지통에 보관된다.
export default function DeleteButton({
  action,
  className = "text-xs text-red-700 underline hover:no-underline",
  children = "삭제",
  redirectTo,
}: {
  action: () => Promise<TrashResult | void>;
  className?: string;
  children?: ReactNode;
  redirectTo?: string; // 상세 화면처럼 지운 뒤 다른 화면으로 가야 할 때
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={`${className} disabled:opacity-50`}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          announceTrashed(result);
          if (redirectTo && result && !("error" in result)) router.push(redirectTo);
          else router.refresh();
        })
      }
    >
      {children}
    </button>
  );
}
