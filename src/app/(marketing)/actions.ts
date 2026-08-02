"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitInquiry(formData: FormData) {
  // 허니팟: 사람 눈에는 안 보이는 필드라 봇만 채워서 제출함. 채워져 있으면 조용히 성공 처리하고 무시한다.
  if (String(formData.get("website") ?? "").trim()) {
    return { success: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !phone) {
    return { error: "이름과 연락처를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    name,
    phone,
    message: message || null,
  });

  if (error) {
    return { error: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { success: true };
}
