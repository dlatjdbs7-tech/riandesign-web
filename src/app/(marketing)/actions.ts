"use server";

import { createClient } from "@/utils/supabase/server";

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  // Server Action을 <form action>이 아니라 클라이언트에서 함수처럼 직접 호출하면
  // Next.js가 파일을 역직렬화한 객체가 서버 런타임의 File 클래스와 instanceof로
  // 일치하지 않을 수 있어, size/name/arrayBuffer 존재 여부로 덕타이핑 검사한다.
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  );
}

async function uploadInquiryFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  field: string
): Promise<string | null> {
  const file = formData.get(field);
  if (!isUploadedFile(file) || file.size === 0) return null;

  // Supabase Storage 오브젝트 키는 비-ASCII 문자(한글 등)를 거부하므로 안전한 키로 치환한다.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("inquiry-files").upload(path, file);
  if (error) return null;

  return supabase.storage.from("inquiry-files").getPublicUrl(path).data.publicUrl;
}

export async function submitInquiry(formData: FormData) {
  // 허니팟: 사람 눈에는 안 보이는 필드라 봇만 채워서 제출함. 채워져 있으면 조용히 성공 처리하고 무시한다.
  if (String(formData.get("website") ?? "").trim()) {
    return { success: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !phone) {
    return { error: "이름과 연락처를 입력해주세요." };
  }

  const supabase = await createClient();

  const [floorPlanUrl, referenceUrl] = await Promise.all([
    uploadInquiryFile(supabase, formData, "floor_plan"),
    uploadInquiryFile(supabase, formData, "reference"),
  ]);

  const { error } = await supabase.from("inquiries").insert({
    name,
    phone,
    message: String(formData.get("message") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    size_py: String(formData.get("size_py") ?? "").trim() || null,
    budget: String(formData.get("budget") ?? "").trim() || null,
    construction_date: String(formData.get("construction_date") ?? "").trim() || null,
    move_in_date: String(formData.get("move_in_date") ?? "").trim() || null,
    family_members: String(formData.get("family_members") ?? "").trim() || null,
    pets: formData.getAll("pets").map(String),
    construction_items: formData.getAll("construction_items").map(String),
    referral_source: String(formData.get("referral_source") ?? "").trim() || null,
    floor_plan_url: floorPlanUrl,
    reference_url: referenceUrl,
  });

  if (error) {
    return { error: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  return { success: true };
}
