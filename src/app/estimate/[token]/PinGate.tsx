"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyEstimatePin } from "./actions";

// 고객 견적서 열기 전: 전화번호 뒤 4자리 입력
export default function PinGate({ token, customerHint }: { token: string; customerHint: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setError(null);
      const result = await verifyEstimatePin(token, pin);
      if ("error" in result) setError(result.error ?? "확인하지 못했습니다.");
      else router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-5">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-sm">
        <p className="text-sm font-bold tracking-[0.25em]">REAN DESIGN</p>
        <h1 className="mt-4 text-xl font-bold">{customerHint} 견적서</h1>
        <p className="mt-2 text-sm text-charcoal/60">
          본인 확인을 위해 견적을 받으신
          <br />
          <b>휴대폰 번호 뒤 4자리</b>를 입력해 주세요.
        </p>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && submit()}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="● ● ● ●"
          aria-label="휴대폰 번호 뒤 4자리"
          className="mt-5 w-full rounded-xl border border-nude px-4 py-3 text-center text-2xl tracking-[0.6em] outline-none focus:border-orange-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pin.length !== 4 || isPending}
          className="mt-3 w-full rounded-xl bg-orange-500 py-3 text-base font-bold text-white hover:bg-orange-600 disabled:opacity-40"
        >
          {isPending ? "확인 중" : "견적서 보기"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-5 text-xs text-charcoal/40">이 링크는 받은 날부터 3일 동안만 열람할 수 있습니다.</p>
      </div>
    </div>
  );
}
