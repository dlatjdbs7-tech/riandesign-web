"use client";

import { useState, useTransition } from "react";
import { approveSharedEstimate } from "./actions";

export default function ApproveEstimate({
  token,
  approvedName,
  approvedAt,
  companyPhone,
}: {
  token: string;
  approvedName: string | null;
  approvedAt: string | null;
  companyPhone: string | null;
}) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState<{ name: string; at: string } | null>(
    approvedName && approvedAt ? { name: approvedName, at: approvedAt } : null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-lg font-bold text-emerald-800">견적을 승인하셨습니다</p>
        <p className="mt-1 text-sm text-emerald-900/70">
          {done.name} 님 · {new Date(done.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
        </p>
        <p className="mt-3 text-sm text-emerald-900/70">담당자가 확인 후 연락드리겠습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold">견적 승인</h2>
      <p className="mt-1 text-sm text-charcoal/60">
        내용을 확인하셨다면 성함을 적고 승인해 주세요. 수정이 필요하시면 승인하지 마시고
        {companyPhone ? ` ${companyPhone}로` : ""} 연락 주세요.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="성함"
          className="flex-1 rounded-lg border border-nude px-4 py-3 text-base outline-none focus:border-orange-400"
        />
        <button
          type="button"
          disabled={isPending || !name.trim() || !agree}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const ok = await approveSharedEstimate(token, name);
              if (ok) setDone({ name: name.trim(), at: new Date().toISOString() });
              else setError("승인하지 못했습니다. 이미 승인되었거나 링크가 바뀌었을 수 있습니다.");
            })
          }
          className="rounded-lg bg-orange-500 px-8 py-3 text-base font-bold text-white hover:bg-orange-600 disabled:opacity-40"
        >
          {isPending ? "처리 중" : "견적 승인"}
        </button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-charcoal/70">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 accent-orange-500" />
        견적 내용(포함·불포함 항목, 부가세 표기)을 확인했습니다.
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
