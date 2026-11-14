"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const TOKEN_RE = /^[0-9a-f-]{36}$/i;
const cookieName = (token: string) => `est_${token.replace(/-/g, "").slice(0, 16)}`;

// 이 브라우저에서 이미 확인한 비밀번호(전화번호 뒤 4자리)
export async function readPin(token: string) {
  const store = await cookies();
  return store.get(cookieName(token))?.value ?? null;
}

// 고객이 전화번호 뒤 4자리를 입력: 맞으면 이 견적서 열람 기간 동안 기억한다
export async function verifyEstimatePin(token: string, pin: string) {
  const digits = pin.replace(/\D/g, "");
  if (!TOKEN_RE.test(token) || digits.length !== 4) return { error: "전화번호 뒤 4자리를 입력해 주세요." };
  const supabase = await createClient();
  const { data: status } = await supabase.rpc("check_shared_estimate", { p_token: token, p_phone: digits });
  if (status === "expired" || status === "not_sent") return { error: "열람 기간(3일)이 지났습니다. 담당자에게 연락해 주세요." };
  if (status !== "ok") {
    await new Promise((r) => setTimeout(r, 800)); // 여러 번 찍어보기 어렵게
    return { error: "번호가 맞지 않습니다. 견적을 받은 휴대폰 번호의 뒤 4자리를 입력해 주세요." };
  }
  const store = await cookies();
  store.set(cookieName(token), digits, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/estimate",
    maxAge: 3 * 24 * 60 * 60,
  });
  return { ok: true as const };
}

// 고객이 성함을 적고 승인
export async function approveSharedEstimate(token: string, name: string) {
  if (!TOKEN_RE.test(token) || !name.trim()) return false;
  const pin = await readPin(token);
  if (!pin) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("approve_shared_estimate", {
    p_token: token,
    p_phone: pin,
    p_name: name.trim().slice(0, 50),
  });
  return data === true;
}
