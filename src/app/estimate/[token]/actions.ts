"use server";

import { createClient } from "@/utils/supabase/server";

// 고객이 링크에서 성함을 적고 승인 (토큰을 아는 사람만 가능, DB 함수가 확인)
export async function approveSharedEstimate(token: string, name: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token) || !name.trim()) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("approve_shared_estimate", { p_token: token, p_name: name.trim().slice(0, 50) });
  return data === true;
}
