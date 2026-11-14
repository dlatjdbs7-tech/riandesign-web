"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { closeShareLink, openShareLink } from "@/app/admin/estimates/actions";

function until(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// 고객에게 보내기: 링크를 3일 동안 열고 주소를 복사한다 (고객은 전화번호를 입력해야 열람)
export default function ShareLinkButton({
  estimateId,
  expiresAt,
  beforeOpen,
}: {
  estimateId: string;
  expiresAt: string | null;
  beforeOpen?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ kind: "idle" } | { kind: "copied"; until: string } | { kind: "error"; text: string }>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const isOpen = !!expiresAt && new Date(expiresAt) > new Date();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            if (beforeOpen && !(await beforeOpen())) return;
            const result = await openShareLink(estimateId);
            if ("error" in result) {
              setState({ kind: "error", text: result.error ?? "링크를 만들지 못했습니다." });
              return;
            }
            const url = `${window.location.origin}/estimate/${result.token}`;
            await navigator.clipboard.writeText(url);
            setState({ kind: "copied", until: result.expiresAt });
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
        className="flex items-center gap-1.5 rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-60"
      >
        <Link2 size={15} /> {isOpen ? "고객 링크 다시 복사 (3일 연장)" : "고객에게 보내기 (링크 복사)"}
      </button>
      {state.kind === "copied" && (
        <span className="text-sm text-emerald-700">복사됐어요 · 카톡에 붙여넣기 · {until(state.until)}까지 열람</span>
      )}
      {state.kind === "error" && <span className="text-sm text-red-600">{state.text}</span>}
      {state.kind === "idle" && isOpen && (
        <span className="flex items-center gap-2 text-xs text-charcoal/55">
          {until(expiresAt!)}까지 열람 가능
          <button
            type="button"
            onClick={async () => {
              await closeShareLink(estimateId);
              router.refresh();
            }}
            className="underline hover:text-red-600"
          >
            지금 닫기
          </button>
        </span>
      )}
    </div>
  );
}
