"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitInquiry(formData: FormData) {
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
