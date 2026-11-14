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
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "copied"; until: string; url: string; copied: boolean } | { kind: "error"; text: string }
  >({ kind: "idle" });
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
            // 고객이 여는 주소: 실제 사이트 주소(NEXT_PUBLIC_SHARE_BASE_URL)가 있으면 그것, 없으면 지금 화면 주소
            const base = (process.env.NEXT_PUBLIC_SHARE_BASE_URL || window.location.origin).replace(/\/$/, "");
            const url = `${base}/estimate/${result.token}`;
            let copied = true;
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              copied = false;
            }
            setState({ kind: "copied", until: result.expiresAt, url, copied });
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
        <span className="flex w-full flex-col gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span>
            {state.copied ? "복사됐어요 · 카톡에 붙여넣기" : "아래 주소를 길게 눌러 복사하세요"} · {until(state.until)}까지 열람
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <code className="select-all break-all rounded bg-white px-2 py-0.5 text-xs text-charcoal">{state.url}</code>
            <a href={state.url} target="_blank" rel="noreferrer" className="text-xs font-medium underline">
              고객 화면 미리 열기
            </a>
          </span>
          {/localhost|127\.0\.0\.1/.test(state.url) && (
            <span className="text-xs text-red-600">이 주소는 이 컴퓨터에서만 열립니다. 고객에게는 실제 사이트에 올린 뒤 보내 주세요.</span>
          )}
        </span>
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
